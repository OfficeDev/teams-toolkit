// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result } from "..";
import { Inputs, Void } from "../types";
import { Context } from "./types";

export interface InnerLoopPlugin {
  runtimeStacks: string[];
  languages: string[];
  scaffoldSourceCode: (ctx: Context, inputs: Inputs) => Promise<Result<Void, FxError>>;
  //localDebug
}

export interface HostingPlugin {
  runtimeStacks: string[];
  //provision
  //deploy
}

export interface TeamsAppPluginSettings {
  tab: {
    innerLoopPlugins: string[];
    hostingPlugins: string[];
    resourcePlugins: string[];
  };
  bot: {
    innerLoopPlugins: string[];
    hostingPlugins: string[];
    resourcePlugins: string[];
  };
}

export interface ComputingResource {
  id: string;
  innerLoopPlugins: string;
  hostingPlugin: string;
  runtimeStack: string;
  dependencies: string[];
  programmingLanguage: string;
}

export interface DatabaseResource {
  id: string;
  hostingPlugin: string;
}

export interface TeamsAppProjectSettings {
  capabilities: ("Tab" | "Bot" | "MessagingExtension")[];
  tab: ComputingResource;
  bot: ComputingResource;
  dependencies: (DatabaseResource | ComputingResource)[];
}
