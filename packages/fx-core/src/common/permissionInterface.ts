export interface ResourcePermission {
  name: string;
  type: string;
  resourceId: string | undefined;
  roles: string[] | undefined;
}
