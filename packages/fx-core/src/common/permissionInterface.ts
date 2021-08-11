export interface ResourcePermission {
  name: string;
  type: string;
  error: any;
  resourceId: string | undefined;
  roles: string[] | undefined;

  // Only Azure resource contains following properties
  subscriptionId?: string;
  resourceGroupName?: string;
  resourceName?: string;
}
