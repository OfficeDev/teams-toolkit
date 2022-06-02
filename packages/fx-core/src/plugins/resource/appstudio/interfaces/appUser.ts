export interface AppUser {
  tenantId: string;
  aadId: string;
  displayName: string;
  userPrincipalName: string;
  isAdministrator: boolean;
}
