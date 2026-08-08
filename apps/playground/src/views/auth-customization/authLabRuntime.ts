export interface AuthLabProvider {
  id: string;
  name: string;
  color: string;
}

export interface AuthLabConsentScope {
  name: string;
  displayName: string;
  description: string;
  required: boolean;
}
