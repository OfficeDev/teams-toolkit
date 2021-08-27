export interface ResourcePermission {
  name: string;
  type: string;
  resourceId: string | undefined;
  roles: string[] | undefined;
}

export interface Collaborator {
  userPrincipalName: string;
  userObjectId: string;
  isAadOwner: boolean;
  teamsAppResourceId: string;
  aadResourceId?: string;
}

export interface AadOwner {
  userObjectId: string;
  resourceId: string;
  displayName: string;
  userPrincipalName: string;
}

export interface TeamsAppAdmin {
  userObjectId: string;
  resourceId: string;
  displayName: string;
  userPrincipalName: string;
}
