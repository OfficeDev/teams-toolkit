import { AppPermissionNodeItem } from "./appPermissionNodeItem";

export interface AppPermissionsItem {
  orgWide: AppPermissionNodeItem[];
  resourceSpecific: AppPermissionNodeItem[];
}
