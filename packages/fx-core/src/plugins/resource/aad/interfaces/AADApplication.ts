export interface AADApplication {
  id?: string | null;
  appId?: string | null;
  disabledByMicrosoftStatus?: string | null;
  displayName: string;
  description?: string | null;
  groupMembershipClaims?: string | null;
  identifierUris: string[];
  isFallbackPublicClient?: boolean | null;
  notes?: string | null;
  signInAudience: string;
  tags: string[];
  tokenEncryptionKeyId?: string | null;
  addIns: AddIn[];
  api: Api;
  appRoles: AppRole[];
  info: Info;
  keyCredentials: KeyCredential[];
  optionalClaims?: OptionalClaims | null;
  parentalControlSettings?: ParentalControlSettings | null;
  publicClient: PublicClient;
  requiredResourceAccess: RequiredResourceAccess[];
  web: Web;
  spa: Spa;

  // ***Not supported properties***
  // passwordCredentials: PasswordCredential[]; // This will be handled by separate logic
  // verifiedPublisher: any; // not exist in manifest
  // isDeviceOnlyAuthSupported: boolean; // not exist in manifest
  // applicationTemplateId: string; // not exist in manifest
  // deletedDateTime: string; // not exist in manifest
  // defaultRedirectUri: any; // not exist in manifest
  // publisherDomain: string; // readonly
  // createdDateTime: string; // readonly
  // certification: any; // no reference
  // serviceManagementReference: any; // no reference
}

export interface Api {
  acceptMappedClaims?: boolean | null;
  knownClientApplications: string[];
  requestedAccessTokenVersion?: number | null;
  oauth2PermissionScopes: Oauth2PermissionScope[];
  preAuthorizedApplications: PreAuthorizedApplication[];
}

export interface Oauth2PermissionScope {
  adminConsentDescription: string;
  adminConsentDisplayName: string;
  id: string;
  isEnabled: boolean;
  type: string;
  userConsentDescription: string;
  userConsentDisplayName: string;
  value: string;
}

export interface PreAuthorizedApplication {
  appId: string;
  delegatedPermissionIds: string[];
}

export interface Info {
  marketingUrl?: string | null;
  privacyStatementUrl?: string | null;
  supportUrl?: string | null;
  termsOfServiceUrl?: string | null;
}

export interface OptionalClaims {
  accessToken: Token[];
  idToken: Token[];
  saml2Token: Token[];
}

export interface Token {
  additionalProperties: string[];
  essential: boolean;
  name: string;
  source?: string | null;
}

export interface ParentalControlSettings {
  countriesBlockedForMinors: string[];
  legalAgeGroupRule?: string | null;
}

export interface PasswordCredential {
  displayName: string;
}

export interface PublicClient {
  redirectUris: string[];
}

export interface RequiredResourceAccess {
  resourceAppId: string;
  resourceAccess: ResourceAccess[];
}

export interface ResourceAccess {
  id: string;
  type: string;
}

export interface Web {
  homePageUrl?: string | null;
  logoutUrl?: string | null;
  redirectUris: string[];
  implicitGrantSettings: ImplicitGrantSettings;
}

export interface ImplicitGrantSettings {
  enableAccessTokenIssuance: boolean;
  enableIdTokenIssuance: boolean;
}

export interface Spa {
  redirectUris: string[];
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface AddIn {
  id: string;
  properties: KeyValuePair[];
  type: string;
}

export interface AppRole {
  allowedMemberTypes: string[];
  description: string;
  displayName: string;
  id: string;
  isEnabled: boolean;
  value: string;
  // origin: string; not exist in manifest
}

export interface KeyCredential {
  customKeyIdentifier: string;
  displayName: string;
  endDateTime: string;
  key: string;
  keyId: string;
  startDateTime: string;
  type: string;
  usage: string;
}
