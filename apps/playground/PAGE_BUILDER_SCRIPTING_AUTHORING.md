# PageBuilder: Page State und Element Code

## Ziel

Der visuelle Baum besitzt weiterhin ausschließlich die Struktur: vorhandene
Elemente, Reihenfolge, Typ und den seitenweit eindeutigen `name`. Verhalten und
Konfiguration werden nicht durch eine ständig wachsende Liste spezieller
Property-Controls modelliert, sondern durch gewöhnliche JavaScript-Syntax mit
Monaco IntelliSense.

Die Architektur hat zwei vom Kunden bearbeitbare Quellen:

- genau ein `stateCode` am Page-Root für den initialen gemeinsamen State;
- optional ein `elementCode` an jedem Element für dessen Konfiguration und
  Aktionen.

Das frühere `pageCode` bleibt im Schema aus Kompatibilitätsgründen lesbar, ist
aber nicht mehr das Authoring-Modell.

## Page State

Der Logic-Tab editiert den initialen State des Page-Dokuments:

```js
definePageState({
  counter: 0,
  selectedUser: null,
  loading: false,
})
```

Der State gehört zum Dokument, nicht zum Host. Er muss aus JSON-sicheren Daten
bestehen. Ein Element-Action-Handler darf ihn verändern; daraufhin führt die
Runtime nur Element-Bindings aus, deren aufgezeichnete Reads den veränderten
Pfad schneiden.

## Element Code

Im Properties Panel bleibt für ein Element nur die strukturelle Konfiguration
sichtbar: `Element` und `Name`. „Add/Edit element code“ öffnet den Monaco-Editor
für genau dieses Element:

```js
defineElement({
  compute(element, page) {
    const length = String(page.fields.username || '').length;
    element.props.label = `Items: ${page.state.counter}`;
    element.style.width = `${200 + length * 8}px`;
    element.props.disabled = !page.form.valid;
  },

  actions: {
    async click(element, page, action) {
      page.state.counter++;
      page.state.lastPayload = action.payload;
    },
  },
})
```

Der tatsächliche persistierte Quelltext trägt auf allen Builder-eigenen Zeilen
`// @locked`-Marker. `defineElement`, `compute`, `actions`, `click`, ihre
Parameterlisten und die schließenden Klammern laufen im Constrained Mode und
können weder umbenannt noch gelöscht werden. Ausschließlich die benannten Slots
`@slot:compute` und `@slot:click` sind editierbar. Dasselbe gilt beim Page State:
`definePageState({` und die schließende Zeile sind gesperrt, nur
`@slot:state` ist editierbar. Alte freie Quellen werden beim ersten Öffnen unter
Erhalt ihrer Bodies in das constrained Template überführt.

Die Marker bleiben Bestandteil des persistierten, validen JavaScript-Texts,
werden in den PageBuilder-Editoren aber vollständig ausgeblendet. Andere Hosts
können das Rendering von außen über CSS-Variablen anpassen:

```css
.my-script-editor {
  --coar-script-editor-marker-display: none;
  --coar-script-editor-locked-line-bg: transparent;
  --coar-script-editor-locked-line-opacity: 0.42;
}
```

Alternativ lassen sich sichtbare Marker über
`--coar-script-editor-marker-scale`, `--coar-script-editor-marker-opacity` und
`--coar-script-editor-marker-color` gestalten. Im expliziten
`authoring`-Modus werden sie wieder sichtbar dargestellt.

### Quick Properties

Häufige Einstellungen können Element-Definitionen über
`builder.quickProperties` registrieren. Der PageBuilder rendert daraus kompakte
Inputs im Properties Panel. Diese Inputs sind keine zweite Logik- oder
Persistenzschicht: Jede Änderung schreibt eine deterministische, gesperrte
Zuweisung an den Anfang von `compute`:

```js
compute(element, page) {
  // Properties Panel values (machine-owned)
  element.props.label = 'Sign in';
  element.style.width = '100%';

  // Customer-authored code runs afterwards and may override those values.
}
```

Der Builder liest ausschließlich seine eigenen `@quick`-Metadaten zurück und
versucht niemals, beliebigen Kunden-Code in Form Controls zu zerlegen. Ein
Reset entfernt nur die zugehörige generierte Zuweisung. Der dann angezeigte
Wert stammt wieder aus dem statischen Element-Draft. Eingebaute Elemente
verwenden gemeinsame Presets; Custom Elements können dieselbe generische
Registry-Schnittstelle für eigene `props.*`, `style.*` oder
`validation.*`-Pfade nutzen. Die Deskriptoren werden nicht im Page-Dokument
dupliziert.

```ts
definePageElement({
  renderer: AcmeRatingRenderer,
  builder: {
    label: { key: 'acme.rating', fallback: 'Rating' },
    defaults: () => ({ label: 'Rating' }),
    quickProperties: [
      {
        path: 'props.label',
        label: { key: 'acme.rating.label', fallback: 'Label' },
        control: 'text',
      },
      {
        path: 'props.disabled',
        label: { key: 'acme.rating.disabled', fallback: 'Disabled' },
        control: 'boolean',
      },
    ],
  },
})
```

Normale lokale Variablen (`const`, `let`), Bedingungen, Schleifen, optional
chaining, ternäre Ausdrücke und andere JavaScript-Sprachkonstrukte funktionieren.
Lokale Variablen leben nur für diesen Aufruf. Dauerhafte, elementübergreifende
Daten gehören in Page State.

### Scope und Mutabilität

- `element` ist ausschließlich der aktuelle mutable Element-Draft. Zulässig sind `props`, `style`,
  `responsive`, `validation`, `visibleWhen`, `bindings` und `defaultValue`.
- `id`, `type`, `name`, Eltern/Kind-Beziehungen und die Struktur werden nie aus
  dem Sandbox-Ergebnis übernommen.
- `page.state` ist in `compute` read-only und in Actions mutable.
- `page.fields`, `page.form`, `page.context`, `page.resources` und
  `page.viewport` sind read-only Inputs.
- `page.elements` existiert bewusst nicht. Ein Element kann keine anderen
  Element-Drafts lesen oder verändern; gemeinsame Kommunikation läuft über State.
- `action.payload` steht Actions zur Verfügung.
- Optionale Host-Capabilities liegen ebenfalls auf `page` und existieren nur,
  wenn der Host sie für die konkrete Action gewährt, beispielsweise `page.api`.
- Eine `actions.click`-Funktion bindet ein Button-/Link-Element automatisch an
  seine interne Action-ID. Diese ID muss nicht vom Autor verwaltet werden.

Der Host normalisiert jedes Ergebnis erneut auf die erlaubten Datenfelder. Selbst
wenn Tenant-Code andere Objekte verändert, haben diese Änderungen außerhalb des
Aufrufs keine Wirkung.

## Reaktivität und Reihenfolge

Jedes `compute` wird als synchrone Worker-Binding kompiliert. Beim ersten Lauf
zeichnet ein read-only Proxy die gelesenen Pfade auf, beispielsweise
`state.counter`, `fields.username` oder `form.valid`. Ein Patch führt nur die
betroffenen Bindings erneut aus. Es gibt daher weder einen Worker pro Expression
noch eine globale „bei jedem Keypress alles neu rechnen“-Schleife.

Element-Skripte werden nicht in einer semantisch relevanten Reihenfolge verkettet.
Jedes Skript startet mit dem statischen Draft seines eigenen Elements und erzeugt
einen Patch. Der Host sammelt die Patches in `PageCodeRuntimeValues`; Vue bringt
nur das normalisierte Endergebnis in Renderer und DOM. Element A sollte deshalb
nicht vom berechneten Ergebnis von Element B lesen. Gemeinsame Ableitungen laufen
über `state`, `fields`, `form`, `context` oder Ressourcen.

## Async und Host-Capabilities

`compute` bleibt synchron und ohne Capabilities. Async gehört in Actions oder
deklarative Ressourcen. Der Host entscheidet pro Runtime-Definition, welche
Objekte als Endowments verfügbar sind. Ohne Grant existiert beispielsweise kein
`page.api`:

```ts
const host = definePageRuntimeHost({
  endowments: { api: applicationApiFacade },
  grants: ({ definition }) =>
    definition.id === 'element-action:loadUsers' ? ['api'] : [],
})
```

Die reale Implementierung und alle Drittanbieter-Abhängigkeiten bleiben im Main
Thread. Im Worker existiert nur ein automatisch erzeugter, datenbasierter
Methoden-Proxy. Der Mensch baut kein manuelles Mapping für jede Library-Methode.

## Sicherheitsgrenze

Der Builder evaluiert keinen Tenant-Code. Der Host erzeugt pro PageRenderer eine
`PageRuntimeSession`; diese besitzt einen SES-Worker und einen eigenen State. Views
teilen keinen Skript-Kontext. Der application-weite `PageRuntimeHost` ist nur der
Capability-Katalog und die Grant-Policy.

Die Compartment-Umgebung besitzt kein Browser-`window`, kein ambient `fetch`, kein
DOM und kein Filesystem. Daten überqueren die Grenze nur als validierte,
zyklusfreie JSON-Werte mit Tiefen-/Größenlimits. Source-Länge, Laufzeit und
Worker-Lebensdauer sind begrenzt.

## Monaco

Page State und Element Code verwenden JavaScript (`checkJs`), nicht TypeScript.
Der Editor erzeugt Typdeklarationen aus:

- dem aktuellen Page State (dadurch sind `state.*`-Properties bekannt);
- dem ausgewählten Element und seinen vorhandenen Props (`element`);
- dem Host-Feld-/Context-Vertrag;
- optionalen Host-Libraries für explizit gewährte Capabilities.

Ein verstecktes Monaco-Preamble typisiert `defineElement` gegen genau diesen
State und dieses Element. Der gespeicherte Quelltext bleibt sauberes JavaScript
und enthält das Preamble nicht.

## Playground-Acceptance

`/page-builder` demonstriert:

- Page State im Logic-Tab;
- einen separaten Monaco-Dialog pro Element;
- Labels, Validation, Styles und responsive-fähige Drafts aus Element Code;
- einen nur bei gültigem Formular aktivierten Submit-Button;
- eine Feld-Abhängigkeit, die die Password-Breite berechnet;
- eine Button-Action, die ein State-Array erweitert;
- einen Repeat und ein separates Label, die reaktiv auf denselben State reagieren.
