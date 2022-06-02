import { AppPermissionNodeItemType } from "./appPermissionNodeItemType";

export interface AppPermissionNodeItem {
  name: string;
  type: AppPermissionNodeItemType | null;
}
