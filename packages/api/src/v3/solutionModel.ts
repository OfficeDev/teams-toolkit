// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Json, SolutionSettings } from "../types";

export enum RuntimeStacks {
  DoNet_6_EA = ".NET 6(Early Access)",
  DoNet_5 = ".NET 5",
  DoNet_Core_3_1 = ".NET Core 3.1(LTS)",
  ASP_DoNET_V48 = "ASP.NET V4.8",
  ASP_DoNET_V35 = "ASP.NET V3.5",
  Node12LTS = "Node 12 LTS",
  Node14LTS = "Node 14 LTS",
}

export interface Module extends Json {
  name: string;
  frameworkProvider: string;
  framework: string;
  language: string;
  runtimeStack: RuntimeStacks;
  resourceProvider?: string;
}

export interface Resource extends Json {
  name: string;
  resourceProvider?: string;
  dependencies?: string[];
  runtimeStack?: RuntimeStacks;
}

export interface TeamsFxSolutionSettings extends SolutionSettings {
  tab?: Module;
  bot?: Module;
  resources?: Resource[];
}

const solutionModel: TeamsFxSolutionSettings = {
  name: "TeamsFxSolutionPlugin",
  tab: {
    name: "tab",
    runtimeStack: RuntimeStacks.Node12LTS,
    frameworkProvider: "ReactFrameworkPlugin",
    language: "javascript",
    framework: "React",
  },
  bot: {
    name: "bot",
    runtimeStack: RuntimeStacks.Node12LTS,
    frameworkProvider: "BotFrameworkPlugin",
    language: "javascript",
    framework: "",
  },
  resources: [
    {
      name: "AzureFunction",
      runtimeStack: RuntimeStacks.Node12LTS,
      resourceProvider: "AzureFunctionPlugin",
    },
    {
      name: "AzureSQL",
      resourceProvider: "AzureSQLPlugin",
      dependencies: ["ManagedIdentity"],
    },
    {
      name: "ManagedIdentity",
      resourceProvider: "ManagedIdentityPlugin",
    },
  ],
};

console.log(solutionModel);
