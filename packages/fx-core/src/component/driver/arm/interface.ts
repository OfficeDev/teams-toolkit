// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface deployArgs {
  subscriptionId: string;
  resourceGroupName: string;
  templates: templateArgs[];
  bicepCliVersion?: string;
}

export interface templateArgs {
  path: string;
  parameters?: string;
  deploymentName: string;
}

export type deploymentOutput = Record<string, any>;
