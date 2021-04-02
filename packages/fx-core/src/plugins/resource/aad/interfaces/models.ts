// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface permissionList {
  resource: string;
  scopes: Array<string>;
  roles: Array<string>;
}

export enum Envs {
  Azure = "azure",
  LocalDebug = "local",
  Both = "both",
}
