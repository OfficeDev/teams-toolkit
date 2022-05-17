// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum ServiceType {
  AppService = "app-service",
  Functions = "functions",
  BotService = "bot-services",
}

export type BicepConfigs = string[];
export type BicepContext = { plugins: string[]; configs: BicepConfigs };
