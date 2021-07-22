// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, PluginContext } from "@microsoft/teamsfx-api";

// WIP: Put the interfaces here temporary to unblock development, they will be moved to the V2 teamsfx-api in the future.
export interface ArmResourcePlugin {
  scaffoldArmTemplate: (ctx: PluginContext) => Promise<Result<ScaffoldArmTemplateResult, FxError>>;
}

export interface BicepOrchestrationTemplate {
  Content: string;
}

export interface BicepOrchestrationParameterTemplate extends BicepOrchestrationTemplate {
  ParameterFile?: string;
}

export interface BicepOrchestrationModuleTemplate extends BicepOrchestrationTemplate {
  Outputs?: { [OutputName: string]: string };
}

export interface BicepModule {
  Content: string;
}

export interface BicepOrchestration {
  ParameterTemplate?: BicepOrchestrationParameterTemplate;
  VariableTemplate?: BicepOrchestrationTemplate;
  ModuleTemplate: BicepOrchestrationModuleTemplate;
  OutputTemplate?: BicepOrchestrationTemplate;
}

export interface ScaffoldArmTemplateResult {
  Modules: { [moduleFileName: string]: BicepModule };
  Orchestration: BicepOrchestration;
}
