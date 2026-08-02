# Feature Request: PageBuilder als vollständiger Editor für sicherheitskritische Auth-Seiten

## Kurzfassung

Wir möchten die eingebauten Modgud-Auth-Seiten als versionierte PageBuilder-JSON-Dokumente
ausliefern. Ein Realm- oder Application-Administrator soll diese Defaults im visuellen
Builder öffnen, Texte und Design anpassen und – falls nötig – auch das Layout verändern
können. Die gleiche JSON-Struktur muss anschließend ohne abweichende Sonderlogik im
`CoarPageRenderer` laufen.

Die Auth Customization Lab unter `/auth-customization-lab` ist die ausführbare
Referenz und Acceptance-Test-Fläche. Sie enthält momentan Login, Passwort-Reset,
Logout und OAuth Consent. Jeder Slot besitzt:

- eine feste Modgud-Referenz;
- den aktuellen JSON-Renderer;
- den echten PageBuilder;
- das persistierte JSON;
- Responsive-Fixtures;
- einen View Contract;
- reproduzierbare API-Fehlerfälle.

Die aktuelle Basis ist bereits wertvoll: JSON-Baum, registrierbare Elemente,
Formwerte, Validierung, Aktionen, `visibleWhen`, Element-Allowlist und sichere
Action-Handler existieren. Für vollständige Auth-Parität fehlen jedoch responsive
Overrides, visuelle Styles, sichere Runtime-Bindings und -Bedingungen, lokalisierte
Werte, Multi-State-Seiten, definierte Feedback-Platzierung und insbesondere native
Arrays/Repeater.

## Warum das notwendig ist

Auth-Seiten sind keine statischen Landingpages. Das sichtbare Layout hängt von
Runtime-Daten und Sicherheitszuständen ab:

- Ein Login kann interne Credentials, Passkey, Magic Link und null bis viele externe
  Provider enthalten.
- Passwort-Reset besitzt Form-, Lade-, generischen Erfolgs-, Fehler- und
  Passwordless-Zustände.
- Logout unterscheidet lokale und föderierte Abmeldung sowie sichere
  Post-Logout-Navigation.
- Consent zeigt eine unbekannte Anzahl serverseitiger Scopes, gesperrte Pflichtwerte,
  optionale Auswahl, ungeprüfte Client-Warnungen und abgelaufene Tickets.

Wenn diese Anforderungen nicht im PageBuilder-Modell ausdrückbar sind, müssen
Consumer große Custom Elements bauen. Dann kann ein Administrator zwar das Element
verschieben, aber nicht dessen inneres Layout oder dessen Texte gestalten. Das wäre
kein echter PageBuilder für Auth-Seiten, sondern nur ein Platzhalter-Editor.

## Zielbild

1. Die eingebauten Modgud-Seiten existieren als mitgelieferte Default-JSON-Dokumente.
2. Ein Administrator kann ein Default-Dokument öffnen und ohne JSON-Kenntnisse
   Texte, Farben, Typografie, Abstände und Layout ändern.
3. Dieselbe Seite lässt sich für Compact, Phone, Tablet und Desktop authoren und
   direkt im Builder prüfen.
4. Der Host liefert ausschließlich erlaubte Runtime-Daten und Aktionen.
5. Das Dokument kann diese Daten darstellen und für Bedingungen/Repeater verwenden,
   aber keine sicherheitskritischen Werte überschreiben.
6. Fehler, Timeouts und Verbindungsabbrüche lassen die View gemountet und erhalten
   alle relevanten Werte.
7. Ein ungültiges oder veraltetes Dokument fällt sicher auf die eingebaute
   Default-View zurück.

## Verbindliche Ownership-Grenze

### PageBuilder-Dokument besitzt

- visuelle Struktur und Reihenfolge;
- editierbare Überschriften, Erklärtexte und Button-Texte;
- Layout, Abstände und responsive Overrides;
- tokenbasierte Farben, Typografie und Elevation;
- Platzierung freigegebener Runtime-Blöcke;
- Bindung von Formfeldern an freigegebene Feldverträge;
- Bindung von Buttons/Links an freigegebene Action-IDs;
- sichere Sichtbarkeitsbedingungen und Repeater-Templates.

### Host/Consumer besitzt immer

- Authentifizierung, Autorisierung und serverseitige Validierung;
- Session-, Ticket-, Token- und OAuth-Lebenszyklus;
- erlaubte Runtime-Daten und deren Typen;
- tatsächliche Action-Handler;
- erlaubte Ziele für Login-, OAuth- und Logout-Redirects;
- Realm-/Application-Auflösung und Variantenwahl;
- Passwort-, Ticket- und Tokenwerte;
- Browser-Tab-Titel, E-Mail-Absender und andere nicht-visuelle Metadaten;
- Sicherheitswarnungen, deren Vorhandensein oder Priorität nicht vom Design entfernt
  werden darf;
- Schema-Prüfung, Migration und sichere Fallback-View.

Das Page-Dokument darf niemals freie URLs, JavaScript, Expressions, Netzwerkaufrufe
oder beliebige Host-Property-Pfade ausführen.

## Funktionale Anforderungen

### 1. Responsive Authoring und Vorschau

Benötigt werden mindestens diese Preview-Presets:

- Compact: 320 × 568;
- Phone: 390 × 844;
- Tablet: 768 × 1024;
- Desktop: 1280 × 800;
- Fluid/Host Container.

Der Autor muss pro Breakpoint nur Abweichungen definieren können. Nicht gesetzte
Werte erben vom kleineren beziehungsweise vom Basis-Breakpoint. Der Builder muss
anzeigen, ob ein Wert lokal gesetzt oder geerbt ist, und einen Override einzeln
zurücksetzen können.

Responsive Overrides werden mindestens benötigt für:

- Stack-Richtung und Wrap;
- Gap und Padding;
- Alignment und Justification;
- Breite, `min-width`, `max-width`, Höhe und `min-height`;
- Sichtbarkeit;
- Textausrichtung und Typografie;
- Button-Anordnung;
- optional andere visuelle Werte, sofern das Designsystem sie erlaubt.

Acceptance-Verhalten:

- Kein horizontaler Seitenüberlauf bei 320 px.
- Vertikales Scrollen bei langen Inhalten ist erlaubt und erwartet.
- Actions dürfen bei langen Listen nicht unerreichbar werden.
- Die Builder-Vorschau und der Standalone-Renderer müssen dieselben Breakpoints und
  dieselbe Kaskade verwenden.

### 2. Tokenbasierte visuelle Styles

`NodeStyle` deckt momentan hauptsächlich Flex-Layout ab. Zusätzlich benötigen wir:

- Surface-/Background-Token;
- Text-/Foreground-Token;
- Border-Token, Breite und Radius;
- Accent-/Semantic-Varianten;
- Card-Elevation/Shadow als Designsystem-Option;
- Font Family aus einer erlaubten Liste;
- Font Size, Weight, Line Height, Letter Spacing und Alignment;
- optional Icon-Größe und -Position;
- `min-width` und `max-width` als First-Class-Controls.

Bevorzugt werden Design Tokens und kontrollierte Varianten statt freier CSS-Werte.
Freie Werte, falls überhaupt erlaubt, müssen validiert und auf harmlose
Darstellungseigenschaften begrenzt werden. Keine `url()`, keine CSS-Injection und
keine Möglichkeit, sicherheitsrelevante Host-Warnungen unsichtbar zu machen.

### 3. Sichere Runtime-Datenbindung

Der Host soll einen typisierten, explizit erlaubten Context-Vertrag bereitstellen.
Beispiele:

```text
branding.productName
branding.logoAssetId
legal.termsUrl
legal.privacyUrl
auth.internalLoginEnabled
auth.passwordless
auth.magicLinkEnabled
auth.registrationEnabled
auth.externalProviders[]
consent.clientName
consent.clientIdHostname
consent.isDynamicallyRegistered
consent.requestedScopes[]
```

Der konkrete API-Name ist Teamentscheidung. Verbindlich ist das Verhalten:

- Der Builder kennt erlaubte Pfade und Typen über `PageConfig` oder einen separaten
  Context-Vertrag.
- Autoren wählen Bindings aus einer UI; sie schreiben keine freien Expressions.
- Der Renderer kann nur deklarierte Pfade lesen.
- Fehlende Werte führen zu definiertem Fallback, nicht zu einem Render-Crash.
- Sensible Werte wie Passwort, Ticket oder Token werden niemals als bindbarer
  Context angeboten.
- Das persistierte JSON enthält nur die Bindungsreferenz, nie den Runtime-Wert.

Text-Props benötigen entweder direkte Bindings oder eine sichere Template-Variante,
zum Beispiel lokalisierter Text plus typisierte Platzhalter. Beliebige
String-Evaluation ist nicht erwünscht.

### 4. Bedingungen gegen Host-Kontext und Page-State

`visibleWhen` kann heute gegen Live-Formwerte prüfen. Auth-Seiten benötigen zusätzlich
Bedingungen gegen erlaubten Host-Kontext und den aktuellen View-State.

Benötigte Operatoren für eine erste Version:

- `equals` / `notEquals`;
- `in` / `notIn`;
- `exists`;
- Array `isEmpty` / `isNotEmpty`;
- optional `length`-Vergleiche.

Mehrere Bedingungen benötigen eine begrenzte `all`-/`any`-Verknüpfung. Keine freie
Expression-Sprache. Der Builder muss ungültige Pfade, Typ-Mismatches und unmögliche
Bedingungen als Lint-Fehler anzeigen.

Beispiele:

- Credentials-Form nur bei `internalLoginEnabled && !passwordless`;
- Magic-Link-Button nur bei freigegebener Capability;
- Registrierungslink nur bei aktivierter Self-Registration;
- Divider nur, wenn mehrere Login-Wege vorhanden sind;
- ungeprüfte Client-Warnung nur bei DCR/CIMD;
- Retry-Button nur bei vorhandenem, host-validiertem Retry-Zustand.

### 5. Native Arrays und Repeater

Consent ist der verbindliche Referenzfall. Der Host liefert:

```ts
interface ConsentScope {
  name: string
  displayName: string
  description?: string | null
  required: boolean
}

requestedScopes: ConsentScope[]
```

Der PageBuilder benötigt einen Container wie `repeat` / `for-each`. Der konkrete
Schema-Name ist Teamentscheidung, aber folgende Eigenschaften sind erforderlich:

- Quelle ist ein erlaubter Array-Pfad aus dem Context-Vertrag;
- stabiler Key aus einem erlaubten Item-Pfad, hier `scope.name`;
- Item-Alias für Bindings innerhalb des Child-Templates;
- optional Index und `first`/`last`, sofern ohne Expressions sicher abbildbar;
- Builder-Vorschau mit konfigurierbaren Fixture-Daten;
- Empty-State-Child oder definierte Darstellung bei leerem Array;
- sichere Obergrenze oder Virtualisierungsstrategie für unerwartet große Arrays;
- verschachtelte Repeater sind für Version 1 nicht zwingend erforderlich;
- Item-Formwerte müssen stabil bleiben, wenn andere Items hinzukommen oder sich die
  Reihenfolge ändert;
- Validierung und Fehlerzuordnung müssen Item und Feld eindeutig adressieren;
- das Action-Result muss ein Array liefern können.

Consent-spezifisches Ergebnis:

- `openid` beziehungsweise jeder `required: true` Scope ist ausgewählt und disabled;
- optionale Scopes sind auswählbar;
- Allow sendet ausschließlich die ausgewählten Scope-Namen als
  `ApprovedScopes[]`;
- Deny sendet ein leeres Array;
- ein fehlgeschlagener Submit erhält exakt die Auswahl;
- Scope-Namen kommen immer aus dem Host-Array und können durch das JSON weder
  erfunden noch verändert werden.

Das Lab verwendet momentan `lab-consent-scopes` als registriertes Custom Element.
Das ist absichtlich als **Workaround** markiert. Ziel ist, dass die innere Scope-Zeile
mit normalen PageBuilder-Nodes authorbar wird.

Ein zweiter Array-Fall sind `externalProviders[]` im Login. Dort reicht oft ein
registered consumer element, wenn das Provider-Button-Innere bewusst nicht
customizable sein soll. Consent beweist jedoch, dass mindestens ein echter
Template-Repeater benötigt wird.

### 6. Lokalisierte Werte

Ein Seitendokument muss mehrere Sprachen unterstützen, ohne dass für jede Sprache
der gesamte Baum dupliziert werden muss.

Benötigt werden:

- lokalisierte String-Props oder Übersetzungsschlüssel mit Override;
- definierte Fallback-Kette, zum Beispiel Realm-Sprache → Default-Sprache →
  eingebauter Text;
- typisierte Platzhalter wie Client- oder Produktname;
- Builder-Sprachumschalter;
- Lint-Hinweis bei fehlender Default-Sprache;
- Tests mit längeren Übersetzungen und Sonderzeichen.

Sicherheitskritische Standardtexte dürfen angepasst werden, aber zwingende Warnungen
dürfen nicht vollständig entfernt oder in eine harmlose visuelle Priorität geändert
werden.

### 7. Multi-State-Seiten

Ein Slot ist nicht gleichbedeutend mit genau einem statischen Baum. Benötigt wird eine
deklarative Möglichkeit für Zustände oder Varianten, beispielsweise:

- Login: Credentials, Passwordless, Magic-Link-Sent, MFA-Continuation, Fehler;
- Forgot Password: Form, Sending, Accepted, Passwordless-Unavailable, Fehler;
- Consent: Loading, Prompt, Submitting, Denied, Expired, Forbidden, Fehler;
- Logout: Complete, Federated-Complete, Recoverable-Provider-Error.

Ob das über View-State-Bedingungen, benannte Varianten oder State-Templates gelöst
wird, ist Teamentscheidung. Verbindlich ist:

- Zustandswechsel ersetzen nicht ungewollt das gesamte Page-Dokument;
- Formwerte überleben einen retrybaren Fehler;
- der Builder kann jeden Zustand mit Fixture-Daten previewen;
- Lade- und Fehlerzustände sind nicht nur außerhalb des Page-Baums angehängt;
- der Host kontrolliert den aktuellen Zustand.

### 8. Definierte Fehler- und Feedback-Platzierung

Action-Fehler erscheinen heute oberhalb des Root-Dokuments. Für Auth-Parität brauchen
wir authorbare, aber semantisch sichere Feedback-Slots beziehungsweise Nodes:

- page-level error;
- form-level error;
- field-level error;
- success/accepted state;
- loading/submitting state.

Der Host liefert Inhalt und Schweregrad. Der Autor darf die Position und begrenzte
Darstellung wählen, aber einen aktiven Fehler nicht komplett verstecken. Hinweise
müssen per Live Region beziehungsweise Fokusmanagement zugänglich sein.

### 9. Builder-Fixtures und Preview-Kontext

Der Builder benötigt kontrollierbare Beispielwerte, ohne echte Auth-Daten oder ein
Backend:

- Host-Context-Fixture pro View;
- Auswahl eines benannten Zustands;
- Array-Größen 0, 1, Typical und Overflow;
- lange Texte und lange Provider-/Scope-Namen;
- Action Loading, Success, Validation Error, HTTP 500, Timeout und Disconnect;
- Viewport-Preset und Sprache.

Fixtures gehören nicht in das Produktionsdokument und dürfen beim Speichern nicht als
Runtime-Daten persistiert werden.

### 10. Authoring-Guardrails

`PageConfig.allowedElements`, `fields`, `availableActions` und der Renderer-Action-Map
bleiben die Basis. Zusätzlich benötigen wir:

- Context-Pfad-Allowlist und Typprüfung;
- required/locked nodes oder Host-Injections für unverzichtbare Sicherheitsinhalte;
- Lint für fehlende Pflichtfelder und Pflichtaktionen;
- Lint für unbekannte Bindings, Breakpoints und Repeater-Keys;
- Lint für unerreichbare oder vollständig versteckte Aktionen;
- Warnung bei horizontalem Overflow in Preview-Presets;
- Größen-/Tiefenlimits für Dokument und Repeater;
- sichere Normalisierung unbekannter Props;
- Schema-Versionierung und Migration für neue Features;
- Preview der sicheren Fallback-View.

Ein Dokument, das den Vertrag verletzt, darf nicht aktiviert werden. Ein bereits
aktiviertes Dokument, das nach einem Package-Update nicht mehr validiert, muss im
Renderer sicher auf den eingebauten Default zurückfallen.

## View Contracts

### Login

Runtime-Daten:

- Branding, Legal URLs, Sprache;
- interne/passwordless Capabilities und Remember-Me-Policy;
- `externalProviders[]`;
- Self-Registration und Application-Continuation.

Pflichtzustände:

- Credentials, Passwordless, Magic-Link-Sent, Submitting, Error, MFA-Continuation;
- keine Provider, nur externe Provider, gemischte Provider.

Invarianten:

- Fehler/Abort navigieren nicht und erhalten Eingaben;
- Passwort gelangt nie in JSON, Log oder URL;
- Continuation ist host-validiert;
- Enter-to-submit und Duplicate-Submit-Schutz;
- korrekte Autofill-/Autocomplete-Semantik;
- lange Providernamen funktionieren bei 320 px und 200 % Zoom.

### Forgot Password

Pflichtzustände:

- Form, Submitting, generisch Accepted, Validation/Rate-Limit Error;
- Passwordless-Unavailable.

Invarianten:

- keine Account Enumeration;
- gleicher Success-Text für existierende und unbekannte Accounts;
- Identifier bleibt bei retrybaren Fehlern erhalten;
- Reset-Token und Ziel-URL sind ausschließlich host-owned;
- Login-Continuation bleibt erhalten.

### Logout

Pflichtzustände:

- lokale Abmeldung abgeschlossen;
- föderierte Abmeldung abgeschlossen;
- recoverable Provider Error.

Invarianten:

- Session ist vor dem Rendern invalidiert;
- Browser Back stellt keine authentifizierten Inhalte wieder her;
- Post-Logout-Ziele sind host-validiert;
- Page JSON kann keinen freien Redirect definieren.

### Consent

Runtime-Daten:

- gebundenes Ticket, Client-ID/-Name, Ablauf;
- `requestedScopes[]`;
- DCR/CIMD-/Unverified-Status und echte Client-ID-Domain.

Pflichtzustände:

- Loading, Prompt, Submitting, Denied, Expired/Consumed, Forbidden, Connection Error;
- ein Pflicht-Scope, typische Liste, lange Overflow-Liste.

Invarianten:

- Pflicht-Scopes bleiben ausgewählt;
- Ticket, Scope-Namen und Client-Identität sind immutable Runtime-Werte;
- Host validiert Ownership, Ablauf und erlaubte Scope-Auswahl erneut;
- ungeprüfte Client-Warnung ist nicht entfernbar/depriorisierbar;
- Allow liefert `ApprovedScopes[]`, Deny `[]`;
- fehlgeschlagener Submit erhält Auswahl und Prompt;
- Retry/Redirect ist host-validiert und same-origin.

## Acceptance Criteria

### A. Default-Dokument-Parität

- Für jeden freigegebenen Slot existiert ein Default-JSON-Dokument.
- Das Dokument rendert funktional gleich wie die feste Referenz.
- Alle im View Contract genannten Zustände können im Builder previewt werden.
- Ein Autor kann Text/Farbe ändern, ohne das Layout neu bauen zu müssen.

### B. Responsive

- Compact, Phone, Tablet, Desktop und Fluid sind im Builder auswählbar.
- Breakpoint-Overrides sind visuell editierbar und zurücksetzbar.
- Login mit langem Providernamen hat bei 320 px keinen horizontalen Overflow.
- Consent mit acht Scopes hat bei 320 px keinen horizontalen Overflow.
- Actions bleiben durch vertikales Scrollen erreichbar.
- Layout bleibt bei 200 % Zoom bedienbar.

### C. Arrays/Consent

- Der Builder kann ein Repeat-Template gegen `requestedScopes[]` authoren.
- 0, 1, 3, 8 und mindestens 50 Fixture-Items rendern deterministisch.
- Required Items sind disabled und bleiben ausgewählt.
- Optionale Auswahl ergibt ein korrektes `ApprovedScopes[]`.
- Reorder/Refresh verliert Item-Werte bei stabilen Keys nicht.
- Ein Action-Fehler erhält Auswahl und View.
- Item-Bindings können nur deklarierte Properties lesen.

### D. Runtime Context und Sicherheit

- Der Builder bietet nur freigegebene Context-Pfade an.
- Handgeschriebenes JSON mit unbekanntem Pfad wird gelintet und sicher ignoriert oder
  abgelehnt.
- Handgeschriebenes JSON kann keine unbekannte Action ausführen.
- Freie Redirects, Netzwerkaufrufe, Scripts und CSS-URL-Injection sind unmöglich.
- Pflichtwarnungen können nicht entfernt oder vollständig versteckt werden.
- Invalides JSON aktiviert keinen kaputten Auth-Flow; der Renderer nutzt die
  Default-View.

### E. Fehlerverhalten

- Validation Error, HTTP 500, Timeout und Disconnect verlassen die View nicht.
- Form-/Array-Werte bleiben erhalten.
- Submit ist während laufender Aktion gegen Doppelaufruf geschützt.
- Fehler ist sichtbar, semantisch als Fehler ausgezeichnet und per Tastatur erreichbar.
- Success kann in einen definierten View-State wechseln, ohne dass der Host eine
  fremde Layout-Implementierung benötigt.

### F. Localization

- DE und EN teilen denselben Strukturbaum.
- Sprachwechsel zeigt lokalisierte Props und Runtime-Texte.
- Default-Fallback funktioniert bei fehlender Übersetzung.
- lange Übersetzungen verursachen keinen horizontalen Overflow.

### G. Schema und Kompatibilität

- Neue Dokumente erhalten eine neue dokumentierte Schema-Version, falls das Wire
  Format erweitert wird.
- Bestehende Schema-v2-Dokumente rendern unverändert.
- Migration ist deterministisch und getestet.
- Builder und Renderer verwenden dieselbe Normalisierung und Validierung.

## Erwartete Tests im Package

- Unit-Tests für Style-Kaskade und Breakpoint-Vererbung;
- Unit-Tests für Context-Allowlist und Typ-Mismatches;
- Unit-Tests für Bedingungen gegen Page-State und Host-Context;
- Unit-Tests für Repeater-Keying, Empty State, Reorder und Wert-Persistenz;
- Unit-Tests für Array-ActionValues;
- Unit-Tests für Localization-Fallback;
- Unit-Tests für locked/required Security Nodes;
- Renderer-Tests für Fehler-, Loading- und Success-Slots;
- Builder-A11y-Tests für Viewport-, State- und Binding-Controls;
- E2E-Tests gegen die Auth Customization Lab;
- Snapshot-/Migrationstests für alte Dokumentversionen.

## Empfohlene Lieferreihenfolge

### Phase 1 – notwendige Auth-Parität

1. Viewport-Presets und responsive Overrides;
2. tokenbasierte Farbe/Typografie/Elevation/Min-Max-Sizing;
3. sichere Context-Bindings und Host-Bedingungen;
4. native Repeater und Array-ActionValues;
5. definierte Feedback-/State-Platzierung;
6. Builder-Fixtures für View-State und Runtime-Daten.

### Phase 2 – Authoring-Qualität

1. lokalisierte Props und Sprachpreview;
2. erweiterte Lints und Overflow-Diagnose;
3. bessere Locked-/Required-Node-UX;
4. Schema-Migration und Default-Dokument-Upgrade-Flow.

### Phase 3 – weitere Modgud-Slots

- Registrierung;
- neues Passwort setzen;
- E-Mail-Verifikation;
- Magic-Link-Auswertung;
- Device-Code-Verifikation;
- MFA/OTP;
- Secure Setup und MFA-Einrichtung.

## Nicht Teil dieses Requests

- Authentifizierungs- oder OAuth-Backendlogik im PageBuilder;
- freie JavaScript-/Template-Ausführung;
- frei konfigurierbare Netzwerkrequests;
- freie Redirect-URLs;
- Speicherung echter Runtime- oder Fixture-Daten im Page-Dokument;
- E-Mail-Absender, Browser-Tab-Titel oder andere nicht-visuelle Metadaten;
- vollständige CMS-/Landingpage-Funktionalität außerhalb der Auth-Use-Cases.

## Definition of Done

Der Request ist abgeschlossen, wenn die vier Lab-Slots ohne große Consumer-Custom-
Elements als normale PageBuilder-Dokumente authorbar sind, die festen Referenzen in
allen View-Contract-Zuständen funktional abbilden, alle Acceptance Criteria in
Package-Tests und Lab-E2E-Tests bestehen und ungültige Customizations jederzeit sicher
auf die eingebauten Defaults zurückfallen.

