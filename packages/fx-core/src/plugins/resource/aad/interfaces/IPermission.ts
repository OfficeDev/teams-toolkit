// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IPermission {
  resource: string;
  scopes: string[];
  roles: string[];
  delegated: string[];
  application: string[];
}
