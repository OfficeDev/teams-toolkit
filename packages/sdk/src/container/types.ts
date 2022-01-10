// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Logger, LogLevel, LogFunction } from "../util/logger";

export interface Mapping {
  [key: string]: any;
}

export type ComponentOption = Record<string, unknown>;

export interface ComponentContainer {
  resolve(componentName: string): unknown;
}

export interface Component extends Mapping {
  name: string;
  initialize(container: ComponentContainer, logger: Logger): void;
}

export const ComponentApiNames = ["constructor", "initialize"];

export interface TeamsFx {
  setLogLevel(level: LogLevel): void;

  getLogLevel(): LogLevel | undefined;

  setLogger(logger?: Logger): void;

  setLogFunction(logFunction?: LogFunction): void;
}
