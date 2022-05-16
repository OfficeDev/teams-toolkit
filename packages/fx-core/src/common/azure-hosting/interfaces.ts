// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum ServiceType {
  AppService = "appservice",
  Function = "function",
  BotService = "botservice",
}

export type BicepConfigs = string[];
export type BicepContext = { plugins: string[]; configs: BicepConfigs };
