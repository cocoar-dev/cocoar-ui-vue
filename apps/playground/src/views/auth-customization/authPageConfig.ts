import type { PageConfig } from '@cocoar/vue-page-builder';

/*
 * Host-side configuration for the auth demo: the fields, actions, states and
 * preview fixtures a login host would supply at runtime. Demo material only —
 * the page-builder itself knows nothing about auth, and the documents these
 * configs pair with are plain JSON in ./documents.
 */

/** Auth views the demo documents cover. */
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
  'visual-markup',
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
    documentLimits: { maxNodes: 500, maxDepth: 30 },
    // Demonstrates host-defined sizes: the extra wide entry is authoring-only,
    // the cascade still resolves it through the built-in desktop breakpoint.
    previewViewports: [
      { id: 'compact', label: 'Compact · 320', width: 320, height: 568 },
      { id: 'phone', label: 'Phone · 390', width: 390, height: 844 },
      { id: 'tablet', label: 'Tablet · 768', width: 768, height: 1024 },
      { id: 'desktop', label: 'Desktop · 1280', width: 1280, height: 800 },
      { id: 'wide', label: 'Wide · 1920', width: 1920, height: 1080 },
      { id: 'fluid', label: 'Fluid' },
    ],
    previewFixtures: [
      { id: 'empty', label: 'Empty arrays', context: fixtureContext(0, 0), state: slot === 'consent' ? 'prompt' : slot === 'password-forgot' ? 'form' : slot === 'logout' ? 'complete' : 'credentials', locale },
      { id: 'typical', label: 'Typical', context: fixtureContext(2, 3), state: slot === 'consent' ? 'prompt' : slot === 'password-forgot' ? 'form' : slot === 'logout' ? 'complete' : 'credentials', locale },
      { id: 'overflow', label: 'Overflow · 50 items', context: fixtureContext(3, 50), state: slot === 'consent' ? 'prompt' : slot === 'password-forgot' ? 'form' : slot === 'logout' ? 'complete' : 'credentials', locale },
    ],
  };
}
