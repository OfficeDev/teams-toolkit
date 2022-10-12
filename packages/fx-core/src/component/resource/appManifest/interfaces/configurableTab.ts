// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ConfigurableTab {
  objectId?: string;
  configurationUrl: string;
  canUpdateConfiguration: boolean;
  scopes: string[];
  context: string[];
  sharePointPreviewImage: string;
  supportedSharePointHosts: string[];
}
