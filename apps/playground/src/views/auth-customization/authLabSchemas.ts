import {
  definePageElement,
  type EmptyProps,
  type PageConfig,
  type PageNode,
} from '@cocoar/vue-page-builder';
import LabBrandElement from './LabBrandElement.vue';
import LabBrandPreview from './LabBrandPreview.vue';
import LabProviderButtonsElement from './LabProviderButtonsElement.vue';
import LabProviderButtonsPreview from './LabProviderButtonsPreview.vue';
import LabConsentScopesElement from './LabConsentScopesElement.vue';
import LabConsentScopesPreview from './LabConsentScopesPreview.vue';

export type AuthLabSlot = 'login' | 'password-forgot' | 'logout' | 'consent';
export type AuthLabLocale = 'de' | 'en';

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

export const AUTH_LAB_COPY: Record<AuthLabLocale, Copy> = {
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

const elements = {
  'lab-brand': definePageElement<EmptyProps>({
    renderer: LabBrandElement,
    builder: {
      label: { key: 'playground.authLab.brand', fallback: 'Runtime branding' },
      icon: 'image',
      defaults: () => ({}),
      preview: LabBrandPreview,
    },
  }),
  'lab-provider-buttons': definePageElement<{ prefix?: string }>({
    renderer: LabProviderButtonsElement,
    builder: {
      label: { key: 'playground.authLab.providers', fallback: 'Runtime login providers' },
      icon: 'log-in',
      defaults: () => ({ prefix: 'Sign in with' }),
      preview: LabProviderButtonsPreview,
    },
  }),
  'lab-consent-scopes': definePageElement<EmptyProps>({
    renderer: LabConsentScopesElement,
    builder: {
      label: { key: 'playground.authLab.consentScopes', fallback: 'Runtime consent scopes[]' },
      icon: 'list-checks',
      defaults: () => ({}),
      preview: LabConsentScopesPreview,
    },
  }),
};

const commonAllowed = [
  'stack',
  'card',
  'section',
  'divider',
  'spacer',
  'heading',
  'paragraph',
  'note',
  'text-input',
  'password-input',
  'checkbox',
  'button',
  'link',
  'image',
  'lab-brand',
] as const;

export function createAuthLabConfig(slot: AuthLabSlot, locale: AuthLabLocale): PageConfig {
  const copy = AUTH_LAB_COPY[locale];
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
    allowedElements:
      slot === 'login'
        ? [...commonAllowed, 'lab-provider-buttons']
        : slot === 'consent'
          ? [...commonAllowed, 'lab-consent-scopes']
          : [...commonAllowed],
    elements,
    fields,
    allowCustomFields: false,
    availableActions: actions,
  };
}

export function createAuthLabSchema(slot: AuthLabSlot, locale: AuthLabLocale): PageNode {
  if (slot === 'password-forgot') return forgotSchema(AUTH_LAB_COPY[locale]);
  if (slot === 'logout') return logoutSchema(AUTH_LAB_COPY[locale]);
  if (slot === 'consent') return consentSchema(AUTH_LAB_COPY[locale]);
  return loginSchema(AUTH_LAB_COPY[locale]);
}

function page(children: PageNode[]): PageNode {
  return {
    id: 'auth-page',
    type: 'page',
    schemaVersion: 2,
    style: {
      minHeight: '100%',
      justify: 'center',
      align: 'center',
      padding: '16px',
    },
    children,
  };
}

function brand(subtitle: string): PageNode {
  return {
    id: 'brand-zone',
    type: 'stack',
    props: { direction: 'column' },
    style: { gap: '8px', align: 'center' },
    children: [
      { id: 'brand', type: 'lab-brand', props: {} },
      {
        id: 'brand-subtitle',
        type: 'paragraph',
        props: { text: subtitle },
        style: { alignSelf: 'center' },
      },
    ],
  };
}

function authFrame(children: PageNode[]): PageNode {
  return {
    id: 'auth-frame',
    type: 'stack',
    props: { direction: 'column' },
    style: {
      size: 'fixed',
      width: 'min(384px, 100%)',
      gap: '32px',
      align: 'stretch',
    },
    children,
  };
}

function divider(copy: Copy): PageNode {
  return {
    id: 'alternative-divider',
    type: 'stack',
    props: { direction: 'row' },
    style: { gap: '12px', align: 'center' },
    children: [
      { id: 'divider-left', type: 'divider', props: {}, style: { size: 'fill' } },
      { id: 'divider-label', type: 'paragraph', props: { text: copy.or } },
      { id: 'divider-right', type: 'divider', props: {}, style: { size: 'fill' } },
    ],
  };
}

function loginSchema(copy: Copy): PageNode {
  const schema = page([
    authFrame([
      brand(copy.subtitle),
      {
        id: 'login-card',
        type: 'card',
        props: {},
        style: { gap: '16px' },
        children: [
          {
            id: 'username',
            type: 'text-input',
            name: 'username',
            props: { label: copy.username, placeholder: copy.username },
            validation: { required: true },
          },
          {
            id: 'password',
            type: 'password-input',
            name: 'password',
            props: { label: copy.password, placeholder: copy.password },
            validation: { required: true },
          },
          {
            id: 'remember',
            type: 'checkbox',
            name: 'rememberMe',
            defaultValue: false,
            props: { label: copy.remember },
          },
          {
            id: 'submit',
            type: 'button',
            props: { label: copy.signIn, action: 'auth:login', validates: true, default: true },
            style: { size: 'fill' },
          },
          divider(copy),
          {
            id: 'passkey',
            type: 'button',
            props: { label: copy.passkey, action: 'auth:passkey', variant: 'secondary' },
            style: { size: 'fill' },
          },
          {
            id: 'magic-link',
            type: 'button',
            props: { label: copy.magic, action: 'auth:magic-link', variant: 'secondary' },
            style: { size: 'fill' },
          },
          {
            id: 'providers',
            type: 'lab-provider-buttons',
            props: { prefix: copy.externalPrefix },
          },
          {
            id: 'forgot-link',
            type: 'link',
            props: { label: copy.forgot, action: 'auth:forgot-password' },
            style: { alignSelf: 'center' },
          },
          {
            id: 'register-link',
            type: 'link',
            props: { label: copy.register, action: 'auth:register' },
            style: { alignSelf: 'center' },
          },
        ],
      },
    ]),
  ]);
  (schema as { enterSubmits?: boolean }).enterSubmits = true;
  return schema;
}

function forgotSchema(copy: Copy): PageNode {
  const schema = page([
    authFrame([
      brand(copy.resetTitle),
      {
        id: 'forgot-card',
        type: 'card',
        props: {},
        style: { gap: '16px' },
        children: [
          { id: 'instructions', type: 'paragraph', props: { text: copy.resetInstructions } },
          {
            id: 'forgot-username',
            type: 'text-input',
            name: 'username',
            props: { label: copy.username, placeholder: copy.username },
            validation: { required: true },
          },
          {
            id: 'forgot-submit',
            type: 'button',
            props: {
              label: copy.sendLink,
              action: 'auth:send-reset-link',
              validates: true,
              default: true,
            },
            style: { size: 'fill' },
          },
          {
            id: 'forgot-back',
            type: 'link',
            props: { label: copy.back, action: 'auth:back-to-login' },
            style: { alignSelf: 'center' },
          },
        ],
      },
    ]),
  ]);
  (schema as { enterSubmits?: boolean }).enterSubmits = true;
  return schema;
}

function logoutSchema(copy: Copy): PageNode {
  return page([
    authFrame([
      { id: 'logout-brand', type: 'lab-brand', props: {} },
      {
        id: 'logout-card',
        type: 'card',
        props: {},
        style: { gap: '16px', align: 'center' },
        children: [
          {
            id: 'logout-title',
            type: 'heading',
            props: { text: copy.signedOut, level: 1 },
            style: { alignSelf: 'center' },
          },
          {
            id: 'logout-copy',
            type: 'paragraph',
            props: { text: copy.signedOutHint },
            style: { alignSelf: 'center' },
          },
          {
            id: 'logout-login',
            type: 'button',
            props: { label: copy.signInAgain, action: 'auth:back-to-login' },
            style: { size: 'fill' },
          },
        ],
      },
    ]),
  ]);
}

function consentSchema(copy: Copy): PageNode {
  return page([
    {
      id: 'consent-frame',
      type: 'stack',
      props: { direction: 'column' },
      style: {
        size: 'fixed',
        width: 'min(448px, 100%)',
        gap: '32px',
        align: 'stretch',
      },
      children: [
        { id: 'consent-brand', type: 'lab-brand', props: {} },
        {
          id: 'consent-card',
          type: 'card',
          props: {},
          style: { gap: '16px' },
          children: [
            {
              id: 'consent-title',
              type: 'heading',
              props: { text: copy.consentTitle, level: 2 },
              style: { alignSelf: 'center' },
            },
            {
              id: 'consent-subtitle',
              type: 'paragraph',
              props: { text: copy.consentSubtitle },
              style: { alignSelf: 'center' },
            },
            { id: 'consent-scopes', type: 'lab-consent-scopes', props: {} },
            {
              id: 'consent-actions',
              type: 'stack',
              props: { direction: 'row' },
              style: { gap: '8px' },
              children: [
                {
                  id: 'consent-deny',
                  type: 'button',
                  props: {
                    label: copy.consentDeny,
                    action: 'auth:consent-deny',
                    variant: 'secondary',
                  },
                  style: { size: 'fill' },
                },
                {
                  id: 'consent-allow',
                  type: 'button',
                  props: { label: copy.consentAllow, action: 'auth:consent-allow' },
                  style: { size: 'fill' },
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
}
