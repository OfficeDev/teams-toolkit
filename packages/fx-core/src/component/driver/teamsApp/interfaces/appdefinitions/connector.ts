// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Connector {
  objectId?: string;
  connectorId?: string;
  name: string;
  configurationUrl: string;
  scopes: string[];
}
