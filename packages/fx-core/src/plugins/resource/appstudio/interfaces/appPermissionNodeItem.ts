// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPermissionNodeItemType } from "./appPermissionNodeItemType";

export interface AppPermissionNodeItem {
  name: string;
  type?: AppPermissionNodeItemType;
}
