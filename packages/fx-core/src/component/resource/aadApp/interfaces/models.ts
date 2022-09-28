// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface permissionList {
  resource: string;
  scopes: Array<string>;
  roles: Array<string>;
}

export interface authFileScenario {
  tab: boolean;
  bot: boolean;
  me: boolean;
}

export enum Envs {
  Azure = "azure",
  LocalDebug = "local",
  Both = "both",
}
