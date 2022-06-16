// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum StaticTabActionType {
  Default = 0,
  MoveUp = 1,
  MoveDown = 2,
}

export interface StaticTab {
  objectId?: string;
  entityId: string;
  name: string;
  contentUrl: string;
  websiteUrl: string;
  scopes: string[];
  context: string[];
}
