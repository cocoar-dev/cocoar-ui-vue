import { setElementQuickProperty } from '../pageCode';
import {
  CURRENT_PAGE_SCHEMA_VERSION,
  type ElementNode,
  type LocalizedValue,
  type PageConfig,
  type PageNode,
  type PageRootNode,
  type PageTranslations,
  type RuntimeTemplate,
} from '../schema';
import { translation, translationKeyFor } from '../translations';

/** Auth views covered by the first integration-ready preset set. */
export type AuthPageSlot = 'login' | 'password-forgot' | 'logout' | 'consent';
export type AuthPageLocale = 'de' | 'en';

type Copy = {
  subtitle: string;
  username: string;
  password: string;
  remember: string;
  signIn: string;
  or: string;
  passkey: string;
  magic: string;
  externalPrefix: string;
  forgot: string;
  register: string;
  resetTitle: string;
  resetInstructions: string;
  sendLink: string;
  back: string;
  signedOut: string;
  signedOutHint: string;
  signInAgain: string;
  consentTitle: string;
  consentSubtitle: string;
  consentDeny: string;
  consentAllow: string;
};

export const AUTH_PAGE_COPY: Record<AuthPageLocale, Copy> = {
  de: {
    subtitle: 'Melden Sie sich an, um fortzufahren.',
    username: 'Benutzername',
    password: 'Passwort',
    remember: 'Angemeldet bleiben',
    signIn: 'Anmelden',
    or: 'oder',
    passkey: 'Mit Passkey anmelden',
    magic: 'Anmelde-Link per E-Mail',
    externalPrefix: 'Anmelden mit',
    forgot: 'Passwort vergessen?',
    register: 'Noch kein Konto? Registrieren →',
    resetTitle: 'Passwort zurücksetzen',
    resetInstructions:
      'Geben Sie Ihren Benutzernamen oder Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen Ihres Passworts.',
    sendLink: 'Link senden',
    back: 'Zurück zur Anmeldung',
    signedOut: 'Abgemeldet',
    signedOutHint: 'Ihre Sitzung wurde sicher beendet.',
    signInAgain: 'Erneut anmelden',
    consentTitle: '„Northwind Analytics“ autorisieren',
    consentSubtitle: 'Prüfen Sie, auf welche Daten diese Anwendung zugreifen möchte.',
    consentDeny: 'Ablehnen',
    consentAllow: 'Zulassen',
  },
  en: {
    subtitle: 'Sign in to continue.',
    username: 'Username',
    password: 'Password',
    remember: 'Stay signed in',
    signIn: 'Sign in',
    or: 'or',
    passkey: 'Sign in with Passkey',
    magic: 'Login link via email',
    externalPrefix: 'Sign in with',
    forgot: 'Forgot password?',
    register: 'No account yet? Register →',
    resetTitle: 'Reset Password',
    resetInstructions:
      'Enter your username or email address. You will receive a link to reset your password.',
    sendLink: 'Send link',
    back: 'Back to login',
    signedOut: 'Signed out',
    signedOutHint: 'Your session has ended safely.',
    signInAgain: 'Sign in again',
    consentTitle: 'Authorise “Northwind Analytics”',
    consentSubtitle: 'Review the access this app is asking for.',
    consentDeny: 'Deny',
    consentAllow: 'Allow',
  },
};

const commonAllowed = [
  'stack',
  'repeat',
  'card',
  'section',
  'divider',
  'spacer',
  'heading',
  'paragraph',
  'note',
  'feedback',
  'text-input',
  'password-input',
  'checkbox',
  'button',
  'link',
  'image',
] as const;

function fixtureContext(providerCount: number, scopeCount: number): Record<string, unknown> {
  return {
    branding: { productName: 'Modgud Preview', showLegal: true },
    auth: {
      internalLoginEnabled: true, passwordless: false, magicLinkEnabled: true, registrationEnabled: true,
      externalProviders: Array.from({ length: providerCount }, (_, index) => ({ id: `provider-${index}`, name: index === providerCount - 1 && providerCount > 2 ? 'Provider with a deliberately very long localized display name' : `Provider ${index + 1}`, color: '#1666cc' })),
    },
    consent: {
      clientName: 'Northwind Analytics', clientHostname: 'analytics.northwind.example', isDynamicallyRegistered: true,
      requestedScopes: Array.from({ length: scopeCount }, (_, index) => ({ name: index === 0 ? 'openid' : `scope-${index}`, displayName: index === scopeCount - 1 && scopeCount > 3 ? 'A permission with a deliberately long display name for overflow testing' : `Permission ${index + 1}`, description: 'Host-provided permission description that remains readable at narrow widths.', required: index === 0 })),
    },
    feedback: { message: '', success: false },
  };
}

export function createAuthPageConfig(slot: AuthPageSlot, locale: AuthPageLocale): PageConfig {
  const copy = AUTH_PAGE_COPY[locale];
  const fields =
    slot === 'login'
      ? [
          {
            name: 'username',
            valueType: 'string',
            label: copy.username,
            required: true,
            defaultElement: 'text-input',
          },
          {
            name: 'password',
            valueType: 'string',
            label: copy.password,
            required: true,
            defaultElement: 'password-input',
          },
          {
            name: 'rememberMe',
            valueType: 'boolean',
            label: copy.remember,
            defaultElement: 'checkbox',
          },
        ]
      : slot === 'password-forgot'
        ? [
            {
              name: 'username',
              valueType: 'string',
              label: copy.username,
              required: true,
              defaultElement: 'text-input',
            },
          ]
        : slot === 'consent'
          ? [{ name: 'approvedScopes', valueType: 'string[]', label: 'Approved scopes' }]
          : [];

  const actions =
    slot === 'login'
      ? [
          { id: 'auth:login', label: copy.signIn },
          { id: 'auth:passkey', label: copy.passkey },
          { id: 'auth:magic-link', label: copy.magic },
          { id: 'auth:forgot-password', label: copy.forgot },
          { id: 'auth:register', label: copy.register },
          { id: 'auth:external-provider', label: 'External provider' },
        ]
      : slot === 'password-forgot'
        ? [
            { id: 'auth:send-reset-link', label: copy.sendLink },
            { id: 'auth:back-to-login', label: copy.back },
          ]
        : slot === 'consent'
          ? [
              { id: 'auth:consent-deny', label: copy.consentDeny },
              { id: 'auth:consent-allow', label: copy.consentAllow },
            ]
          : [{ id: 'auth:back-to-login', label: copy.signInAgain }];

  return {
    allowedElements: [...commonAllowed],
    fields,
    allowCustomFields: false,
    availableActions: [
      ...actions,
      { id: 'legal:terms', label: 'Terms' },
      { id: 'legal:privacy', label: 'Privacy' },
    ],
    contextFields: [
      { path: 'branding.productName', type: 'string' },
      { path: 'branding.showLegal', type: 'boolean' },
      { path: 'auth.internalLoginEnabled', type: 'boolean' },
      { path: 'auth.passwordless', type: 'boolean' },
      { path: 'auth.magicLinkEnabled', type: 'boolean' },
      { path: 'auth.registrationEnabled', type: 'boolean' },
      {
        path: 'auth.externalProviders',
        type: 'array',
        itemFields: [
          { path: 'id', type: 'string' },
          { path: 'name', type: 'string' },
          { path: 'color', type: 'string' },
        ],
      },
      { path: 'consent.clientName', type: 'string' },
      { path: 'consent.clientHostname', type: 'string' },
      { path: 'consent.isDynamicallyRegistered', type: 'boolean' },
      {
        path: 'consent.requestedScopes',
        type: 'array',
        itemFields: [
          { path: 'name', type: 'string' },
          { path: 'displayName', type: 'string' },
          { path: 'description', type: 'string' },
          { path: 'required', type: 'boolean' },
        ],
      },
      { path: 'feedback.message', type: 'string' },
      { path: 'feedback.success', type: 'boolean' },
      { path: 'runtime.viewState', type: 'string' },
    ],
    availableStates: (slot === 'login'
      ? ['credentials', 'passwordless', 'magic-link-sent', 'submitting', 'error', 'mfa-continuation']
      : slot === 'password-forgot'
        ? ['form', 'submitting', 'accepted', 'passwordless-unavailable', 'error']
        : slot === 'consent'
          ? ['loading', 'prompt', 'submitting', 'denied', 'expired', 'forbidden', 'error']
          : ['complete', 'federated-complete', 'provider-error'])
      .map((id) => ({ id, label: id })),
    locales: [{ id: 'de', label: 'Deutsch' }, { id: 'en', label: 'English' }],
    defaultLocale: 'en',
    requiredNodes: slot === 'consent'
      ? [{ id: 'unverified-client-warning', type: 'note', lockStyle: true, parentId: 'consent-card', maxIndex: 4 }]
      : [],
    documentLimits: { maxNodes: 500, maxDepth: 30 },
    previewFixtures: [
      { id: 'empty', label: 'Empty arrays', context: fixtureContext(0, 0), state: slot === 'consent' ? 'prompt' : slot === 'password-forgot' ? 'form' : slot === 'logout' ? 'complete' : 'credentials', locale },
      { id: 'typical', label: 'Typical', context: fixtureContext(2, 3), state: slot === 'consent' ? 'prompt' : slot === 'password-forgot' ? 'form' : slot === 'logout' ? 'complete' : 'credentials', locale },
      { id: 'overflow', label: 'Overflow · 50 items', context: fixtureContext(3, 50), state: slot === 'consent' ? 'prompt' : slot === 'password-forgot' ? 'form' : slot === 'logout' ? 'complete' : 'credentials', locale },
    ],
  };
}

export function createAuthPageDocument(slot: AuthPageSlot): PageNode {
  const schema = slot === 'password-forgot'
    ? forgotSchema()
    : slot === 'logout'
      ? logoutSchema()
      : slot === 'consent'
        ? consentSchema()
        : loginSchema();
  return enableCodeAuthoring(schema);
}

const QUICK_PROP_KEYS = new Set(['label', 'text', 'placeholder', 'variant', 'disabled']);

const COMPUTE_BODIES: Record<string, string> = {
  credentials: `element.style.hidden = !(page.context.auth?.internalLoginEnabled && !page.context.auth?.passwordless);`,
  'passwordless-info': `element.style.hidden = !(page.context.auth?.internalLoginEnabled && page.context.auth?.passwordless);`,
  passkey: `element.style.hidden = !page.context.auth?.internalLoginEnabled;`,
  'magic-link': `element.style.hidden = !page.context.auth?.magicLinkEnabled;`,
  'forgot-link': `element.style.hidden = !(page.context.auth?.internalLoginEnabled && !page.context.auth?.passwordless);`,
  'register-link': `element.style.hidden = !page.context.auth?.registrationEnabled;`,
  submit: `element.props.disabled = !page.fields.username?.trim() || !page.fields.password || !page.form.valid || page.form.submitting;`,
  'magic-link-sent': `element.style.hidden = page.context.runtime?.viewState !== 'magic-link-sent';`,
  'mfa-continuation': `element.style.hidden = page.context.runtime?.viewState !== 'mfa-continuation';`,
  'forgot-unavailable': `element.style.hidden = page.context.runtime?.viewState !== 'passwordless-unavailable';`,
  'forgot-accepted': `element.style.hidden = page.context.runtime?.viewState !== 'accepted';`,
  'forgot-form': `element.style.hidden = !['form', 'error', 'submitting'].includes(page.context.runtime?.viewState);`,
  'forgot-submit': `element.props.disabled = !page.fields.username?.trim() || !page.form.valid || page.form.submitting;`,
  'consent-loading-state': `element.style.hidden = page.context.runtime?.viewState !== 'loading';`,
  'consent-denied-state': `element.style.hidden = page.context.runtime?.viewState !== 'denied';`,
  'consent-expired-state': `element.style.hidden = page.context.runtime?.viewState !== 'expired';`,
  'consent-forbidden-state': `element.style.hidden = page.context.runtime?.viewState !== 'forbidden';`,
  'consent-card': `element.style.hidden = !['prompt', 'submitting', 'error'].includes(page.context.runtime?.viewState);`,
  'consent-deny': `element.props.disabled = page.form.submitting;`,
  'consent-allow': `element.props.disabled = page.form.submitting;`,
};

function elementSource(body?: string): string | undefined {
  if (!body) return undefined;
  return `defineElement({
  compute(element, page) {
    ${body}
  },
})`;
}

function elementName(id: string): string {
  const words = id.split(/[^A-Za-z0-9_$]+/).filter(Boolean);
  const joined = words.map((word, index) => index === 0
    ? word
    : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('') || 'element';
  return joined.replace(/^[^A-Za-z_$]/, (match) => `_${match}`);
}

/**
 * Turns the fixed Auth defaults into the code-authoring reference without
 * changing their safe static fallback. Structure/action ids stay declarative;
 * common visual values become Quick Property assignments and reactive UI
 * behaviour lives in the free compute body.
 */
function enableCodeAuthoring(schema: PageNode): PageNode {
  const translations: PageTranslations = {};
  if (schema.type === 'page') {
    (schema as PageRootNode).stateCode = `definePageState({
  interactionCount: 0,
})`;
  }
  const migrateText = (value: unknown, elementName: string, path: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('localized' in value)) return value;
    const legacy = value as LocalizedValue<string>;
    const key = translationKeyFor(elementName, path);
    for (const [locale, text] of Object.entries(legacy.localized)) {
      translations[locale] = { ...(translations[locale] ?? {}), [key]: text };
    }
    return translation(key, undefined, legacy.fallback);
  };
  const walk = (node: PageNode) => {
    if (node.type !== 'page') {
      const element = node as ElementNode;
      element.name ??= elementName(element.id);
      for (const [key, value] of Object.entries(element.props ?? {})) {
        element.props[key] = migrateText(value, element.name, `props.${key}`);
      }
      for (const [target, binding] of Object.entries(element.bindings ?? {})) {
        if (binding && typeof binding === 'object' && 'template' in binding) {
          const template = binding as RuntimeTemplate;
          element.bindings![target] = {
            ...template,
            template: migrateText(template.template, element.name, `props.${target}`) as RuntimeTemplate['template'],
          };
        }
      }
      let source = elementSource(COMPUTE_BODIES[element.id]);
      for (const [key, value] of Object.entries(element.props ?? {})) {
        if (QUICK_PROP_KEYS.has(key)) {
          source = setElementQuickProperty(source, `props.${key}`, value);
        }
      }
      for (const [key, value] of Object.entries(element.style ?? {})) {
        if (value === null || typeof value !== 'object') {
          source = setElementQuickProperty(source, `style.${key}`, value);
        }
      }
      if (element.validation?.required !== undefined) {
        source = setElementQuickProperty(source, 'validation.required', element.validation.required);
      }
      if (source) element.elementCode = source;
    }
    if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
  };
  walk(schema);
  if (schema.type === 'page') (schema as PageRootNode).translations = translations;
  return schema;
}

const loc = (de: string, en: string) => ({ localized: { de, en }, fallback: en });
const condition = (path: string, value: unknown) => ({ source: 'context' as const, path, operator: 'equals' as const, value });

function page(children: PageNode[], enterSubmits = false): PageNode {
  return {
    id: 'auth-page', type: 'page', schemaVersion: CURRENT_PAGE_SCHEMA_VERSION, enterSubmits,
    style: { minHeight: '100%', justify: 'center', align: 'center', padding: '12px', surface: 'subtle' },
    responsive: { phone: { padding: '16px' } }, children,
  };
}

function brand(id: string, subtitle?: ReturnType<typeof loc>): PageNode {
  return {
    id: `${id}-brand-zone`, type: 'stack', props: { direction: 'column' }, style: { gap: '8px', align: 'center' },
    children: [
      { id: `${id}-brand-mark`, type: 'heading', props: { text: 'M', level: 2 }, style: { size: 'fixed', width: '64px', height: '64px', alignSelf: 'center', surface: 'accent', foreground: 'accent', radius: 'large', textAlign: 'center', fontSize: 'xlarge', fontWeight: 'bold', padding: '16px' }, responsive: { phone: { width: '64px', height: '64px' } } },
      { id: `${id}-product-name`, type: 'heading', props: { text: 'Modgud', level: 1 }, bindings: { text: { source: 'context', path: 'branding.productName', fallback: 'Modgud' } }, style: { alignSelf: 'center', fontSize: 'xlarge', fontWeight: 'bold', textAlign: 'center' } },
      {
        id: `${id}-legal`, type: 'stack', props: { direction: 'row' }, style: { gap: '12px', align: 'center', fontSize: 'caption' },
        visibleWhen: condition('branding.showLegal', true),
        children: [
          { id: `${id}-terms`, type: 'link', props: { label: 'Terms', action: 'legal:terms' } },
          { id: `${id}-privacy`, type: 'link', props: { label: 'Privacy', action: 'legal:privacy' } },
        ],
      },
      ...(subtitle ? [{ id: `${id}-subtitle`, type: 'paragraph', props: { text: subtitle }, style: { alignSelf: 'center', textAlign: 'center' } } as PageNode] : []),
    ],
  };
}

function authFrame(id: string, children: PageNode[], maxWidth = '384px'): PageNode {
  return { id, type: 'stack', props: { direction: 'column' }, style: { size: 'fill', maxWidth, gap: '20px', align: 'stretch' }, responsive: { tablet: { gap: '32px' } }, children };
}

function formFeedback(prefix: string): PageNode[] {
  return [
    { id: `${prefix}-action-error`, type: 'feedback', props: { kind: 'form-error' } },
    { id: `${prefix}-success`, type: 'feedback', props: { kind: 'success', text: '' }, bindings: { text: { source: 'context', path: 'feedback.message', fallback: '' } }, visibleWhen: condition('feedback.success', true) },
  ];
}

function divider(): PageNode {
  return { id: 'alternative-divider', type: 'stack', props: { direction: 'row' }, style: { gap: '12px', align: 'center' }, children: [
    { id: 'divider-left', type: 'divider', props: {}, style: { size: 'fill' } },
    { id: 'divider-label', type: 'paragraph', props: { text: loc('oder', 'or') } },
    { id: 'divider-right', type: 'divider', props: {}, style: { size: 'fill' } },
  ] };
}

function loginSchema(): PageNode {
  const credentialsVisible = { all: [condition('auth.internalLoginEnabled', true), condition('auth.passwordless', false)] };
  return page([authFrame('auth-frame', [
    brand('login', loc('Melden Sie sich an, um fortzufahren.', 'Sign in to continue.')),
    { id: 'login-card', type: 'card', props: {}, style: { gap: '16px', elevation: 'medium', radius: 'large' }, children: [
      { id: 'magic-link-sent', type: 'note', props: { variant: 'success', text: loc('Der Anmelde-Link wurde gesendet.', 'The login link has been sent.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'magic-link-sent' } },
      { id: 'mfa-continuation', type: 'note', props: { variant: 'info', text: loc('Fahren Sie mit dem zweiten Faktor fort.', 'Continue with your second authentication factor.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'mfa-continuation' } },
      { id: 'credentials', type: 'stack', props: { direction: 'column' }, style: { gap: '16px' }, visibleWhen: credentialsVisible, children: [
        { id: 'username', type: 'text-input', name: 'username', props: { label: loc('Benutzername', 'Username'), placeholder: loc('Benutzername', 'Username') }, validation: { required: true } },
        { id: 'password', type: 'password-input', name: 'password', props: { label: loc('Passwort', 'Password'), placeholder: loc('Passwort', 'Password') }, validation: { required: true } },
        { id: 'remember', type: 'checkbox', name: 'rememberMe', defaultValue: false, props: { label: loc('Angemeldet bleiben', 'Stay signed in') } },
        ...formFeedback('login'),
        { id: 'submit', type: 'button', props: { label: loc('Anmelden', 'Sign in'), action: 'auth:login', validates: true, default: true }, style: { size: 'fill' } },
      ] },
      { id: 'passwordless-info', type: 'note', props: { variant: 'info', text: loc('Diese Anwendung verwendet eine passwortlose Anmeldung.', 'This application uses passwordless login.') }, visibleWhen: { all: [condition('auth.internalLoginEnabled', true), condition('auth.passwordless', true)] } },
      divider(),
      { id: 'passkey', type: 'button', props: { label: loc('Mit Passkey anmelden', 'Sign in with Passkey'), action: 'auth:passkey', variant: 'secondary' }, style: { size: 'fill' }, visibleWhen: condition('auth.internalLoginEnabled', true) },
      { id: 'magic-link', type: 'button', props: { label: loc('Anmelde-Link per E-Mail', 'Login link via email'), action: 'auth:magic-link', variant: 'secondary' }, style: { size: 'fill' }, visibleWhen: condition('auth.magicLinkEnabled', true) },
      {
        id: 'providers', type: 'repeat', props: { source: 'auth.externalProviders', keyPath: 'id', itemAlias: 'provider', emptyText: '' }, style: { gap: '12px' }, children: [
          { id: 'provider-button', type: 'button', props: { label: 'Sign in with', action: 'auth:external-provider', variant: 'secondary', actionValueField: 'providerId' }, bindings: {
            label: { template: loc('Anmelden mit {name}', 'Sign in with {name}'), placeholders: { name: { source: 'item', path: 'name' } } },
            actionValue: { source: 'item', path: 'id' },
          }, style: { size: 'fill' } },
        ],
      },
      { id: 'forgot-link', type: 'link', props: { label: loc('Passwort vergessen?', 'Forgot password?'), action: 'auth:forgot-password' }, style: { alignSelf: 'center' }, visibleWhen: credentialsVisible },
      { id: 'register-link', type: 'link', props: { label: loc('Noch kein Konto? Registrieren →', 'No account yet? Register →'), action: 'auth:register' }, style: { alignSelf: 'center' }, visibleWhen: condition('auth.registrationEnabled', true) },
    ] },
  ])], true);
}

function forgotSchema(): PageNode {
  return page([authFrame('forgot-frame', [
    brand('forgot', loc('Passwort zurücksetzen', 'Reset password')),
    { id: 'forgot-card', type: 'card', props: {}, style: { gap: '16px', elevation: 'medium', radius: 'large' }, children: [
      { id: 'forgot-unavailable', type: 'note', props: { variant: 'info', text: loc('Passwort-Zurücksetzen ist für die passwortlose Anmeldung nicht verfügbar.', 'Password reset is unavailable for passwordless login.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'passwordless-unavailable' } },
      { id: 'forgot-accepted', type: 'note', props: { variant: 'success', text: loc('Wenn ein Konto existiert, wurde eine Nachricht gesendet.', 'If an account exists, a message has been sent.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'accepted' } },
      { id: 'forgot-form', type: 'stack', props: { direction: 'column' }, style: { gap: '16px' }, visibleWhen: { any: [{ source: 'state', operator: 'equals', value: 'form' }, { source: 'state', operator: 'equals', value: 'error' }, { source: 'state', operator: 'equals', value: 'submitting' }] }, children: [
        { id: 'instructions', type: 'paragraph', props: { text: loc('Geben Sie Ihren Benutzernamen oder Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen Ihres Passworts.', 'Enter your username or email address. You will receive a link to reset your password.') } },
        { id: 'forgot-username', type: 'text-input', name: 'username', props: { label: loc('Benutzername', 'Username'), placeholder: loc('Benutzername', 'Username') }, validation: { required: true } },
        ...formFeedback('forgot'),
        { id: 'forgot-submit', type: 'button', props: { label: loc('Link senden', 'Send link'), action: 'auth:send-reset-link', validates: true, default: true }, style: { size: 'fill' } },
      ] },
      { id: 'forgot-back', type: 'link', props: { label: loc('Zurück zur Anmeldung', 'Back to login'), action: 'auth:back-to-login' }, style: { alignSelf: 'center' } },
    ] },
  ])], true);
}

function logoutSchema(): PageNode {
  return page([authFrame('logout-frame', [
    brand('logout'),
    { id: 'logout-card', type: 'card', props: {}, style: { gap: '16px', align: 'center', elevation: 'medium', radius: 'large', textAlign: 'center' }, children: [
      { id: 'logout-title', type: 'heading', props: { text: loc('Abgemeldet', 'Signed out'), level: 1 }, style: { alignSelf: 'center' } },
      { id: 'logout-copy', type: 'paragraph', props: { text: loc('Ihre Sitzung wurde sicher beendet.', 'Your session has ended safely.') }, style: { alignSelf: 'center' } },
      ...formFeedback('logout'),
      { id: 'logout-login', type: 'button', props: { label: loc('Erneut anmelden', 'Sign in again'), action: 'auth:back-to-login' }, style: { size: 'fill' } },
    ] },
  ])]);
}

function consentSchema(): PageNode {
  return page([authFrame('consent-frame', [
    brand('consent'),
    { id: 'consent-loading-state', type: 'note', props: { variant: 'info', text: loc('Autorisierungsanfrage wird geladen …', 'Loading authorization request…') }, visibleWhen: { source: 'state', operator: 'equals', value: 'loading' } },
    { id: 'consent-denied-state', type: 'note', props: { variant: 'info', text: loc('Die Anfrage wurde abgelehnt.', 'The request was denied.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'denied' } },
    { id: 'consent-expired-state', type: 'note', props: { variant: 'warning', text: loc('Diese Autorisierungsanfrage ist abgelaufen oder wurde bereits verwendet.', 'This authorization request expired or was already used.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'expired' } },
    { id: 'consent-forbidden-state', type: 'note', props: { variant: 'error', text: loc('Diese Anfrage gehört nicht zu Ihrer Sitzung.', 'This request does not belong to your session.') }, visibleWhen: { source: 'state', operator: 'equals', value: 'forbidden' } },
    { id: 'consent-card', type: 'card', props: {}, style: { gap: '16px', elevation: 'medium', radius: 'large' }, visibleWhen: { any: [{ source: 'state', operator: 'equals', value: 'prompt' }, { source: 'state', operator: 'equals', value: 'submitting' }, { source: 'state', operator: 'equals', value: 'error' }] }, children: [
      { id: 'consent-title', type: 'heading', props: { text: '', level: 2 }, bindings: { text: { template: loc('„{client}“ autorisieren', 'Authorise “{client}”'), placeholders: { client: { source: 'context', path: 'consent.clientName', fallback: 'Application' } } } }, style: { alignSelf: 'center', textAlign: 'center', fontSize: 'large' } },
      { id: 'consent-subtitle', type: 'paragraph', props: { text: loc('Prüfen Sie, auf welche Daten diese Anwendung zugreifen möchte.', 'Review the access this app is asking for.') }, style: { alignSelf: 'center', textAlign: 'center' } },
      { id: 'consent-identity', type: 'paragraph', props: { text: '' }, bindings: { text: { template: loc('App-Identität: {hostname}', 'App identity: {hostname}'), placeholders: { hostname: { source: 'context', path: 'consent.clientHostname' } } } }, style: { alignSelf: 'center', textAlign: 'center', fontSize: 'small', fontWeight: 'semibold' } },
      { id: 'unverified-client-warning', type: 'note', props: { variant: 'warning', text: '' }, bindings: { text: { template: loc('Diese App wird durch die Domain {hostname} identifiziert. Autorisieren Sie sie nur, wenn Sie dieser Domain vertrauen.', 'This app is identified by the domain {hostname}. Only authorise it if you trust this domain.'), placeholders: { hostname: { source: 'context', path: 'consent.clientHostname' } } } }, visibleWhen: condition('consent.isDynamicallyRegistered', true) },
      {
        id: 'consent-scopes', type: 'repeat', props: { source: 'consent.requestedScopes', keyPath: 'name', itemAlias: 'scope', maxItems: 100, emptyText: 'No permissions requested.', selection: { name: 'approvedScopes', valuePath: 'name', requiredPath: 'required', defaultSelected: true } }, style: { gap: '8px' }, children: [
          { id: 'scope-row', type: 'stack', props: { direction: 'column' }, style: { gap: '4px', padding: '10px 12px', borderTone: 'neutral', borderWidth: '1px', radius: 'medium', surface: 'default', minWidth: '0' }, children: [
            { id: 'scope-checkbox', type: 'checkbox', name: '$selection', props: { label: '' }, bindings: { label: { source: 'item', path: 'displayName' } } },
            { id: 'scope-description', type: 'paragraph', props: { text: '' }, bindings: { text: { source: 'item', path: 'description', fallback: '' } }, style: { fontSize: 'caption' } },
            { id: 'scope-required', type: 'paragraph', props: { text: loc('Erforderlich', 'Required') }, visibleWhen: { source: 'item', path: 'required', operator: 'equals', value: true }, style: { fontSize: 'caption', foreground: 'tertiary' } },
          ] },
        ],
      },
      ...formFeedback('consent'),
      { id: 'consent-actions', type: 'stack', props: { direction: 'column' }, style: { gap: '8px' }, responsive: { phone: { direction: 'row' } }, children: [
        { id: 'consent-deny', type: 'button', props: { label: loc('Ablehnen', 'Deny'), action: 'auth:consent-deny', variant: 'secondary', actionValues: { approvedScopes: [] } }, style: { size: 'fill' } },
        { id: 'consent-allow', type: 'button', props: { label: loc('Zulassen', 'Allow'), action: 'auth:consent-allow' }, style: { size: 'fill' } },
      ] },
    ] },
  ], '448px')]);
}
