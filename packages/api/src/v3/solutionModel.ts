// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum RuntimeStacks {
  DoNet_6_EA = ".NET 6(Early Access)",
  DoNet_5 = ".NET 5",
  DoNet_Core_3_1 = ".NET Core 3.1(LTS)",
  ASP_DoNET_V48 = "ASP.NET V4.8",
  ASP_DoNET_V35 = "ASP.NET V3.5",
  Node12LTS = "Node 12 LTS",
  Node14LTS = "Node 14 LTS",
}

export interface Component {
  type: "WorkspaceModule" | "ExternalResource";
}

export interface Dependency {
  name: string;
  peer: boolean;
}

export interface WorkspaceModule extends Component {
  name: string;
  type: "WorkspaceModule";
  runtimeStack: RuntimeStacks;
  scaffoldingPlugin: string; // specified in scaffolding stage
  containerHostingPlugin?: string; //specified in local-debug and provision stage
  dependencies?: Dependency[]; // specified in scaffolding stage
}

export interface ExternalResource extends Component {
  name: string;
  type: "ExternalResource";
  resourceHostingPlugin?: string; //specified in add-resource stage
  dependencies?: Dependency[];
}

export interface TeamsFxSolutionModel {
  tab?: WorkspaceModule;
  bot?: WorkspaceModule;
  modules?: WorkspaceModule[];
  resources?: ExternalResource[];
}

const solutionModel: TeamsFxSolutionModel = {
  tab: {
    name: "tab",
    type: "WorkspaceModule",
    runtimeStack: RuntimeStacks.Node12LTS,
    scaffoldingPlugin: "some tab scaffolding plugin",
    dependencies: [
      {
        name: "myFunctionApp",
        peer: false,
      },
    ],
  },
  bot: {
    name: "bot",
    type: "WorkspaceModule",
    runtimeStack: RuntimeStacks.Node12LTS,
    scaffoldingPlugin: "some bot scaffolding plugin",
    dependencies: [
      {
        name: "sql",
        peer: false,
      },
    ],
  },
  modules: [
    {
      name: "myFunctionApp",
      type: "WorkspaceModule",
      runtimeStack: RuntimeStacks.Node12LTS,
      scaffoldingPlugin: "some function scaffolding plugin",
      dependencies: [
        {
          name: "sql1",
          peer: false,
        },
      ],
    },
  ],
  resources: [
    {
      name: "sql1",
      type: "ExternalResource",
      resourceHostingPlugin: "some function scaffolding plugin",
      dependencies: [
        {
          name: "identify1",
          peer: true,
        },
      ],
    },
    {
      name: "identify1",
      type: "ExternalResource",
      resourceHostingPlugin: "some function scaffolding plugin",
    },
  ],
};

console.log(solutionModel);
