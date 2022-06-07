// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPermissionNodeItem } from "./appPermissionNodeItem";

export interface AppPermissionsItem {
  orgWide: AppPermissionNodeItem[];
  resourceSpecific: AppPermissionNodeItem[];
}
