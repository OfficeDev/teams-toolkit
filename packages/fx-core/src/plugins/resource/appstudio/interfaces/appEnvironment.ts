// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppEnvironmentProperty } from "./appEnvironmentProperty";

export interface AppEnvironment {
  id: string;
  displayName: string;
  properties: AppEnvironmentProperty[];
}
