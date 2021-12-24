// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Mapping {
  [key: string]: any;
}

export type ComponentOption = Record<string, unknown>;

export interface ComponentContainer {
  resolve(componentName: string, identifier?: string): unknown;
}

export interface Component extends Mapping {
  name: string;
  version: string;
  initialize(container: ComponentContainer): void;
}
