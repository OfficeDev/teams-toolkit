// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Result, PluginContext } from "@microsoft/teamsfx-api";

// WIP: Put the interfaces here temporary to unblock development, they will be moved to the V2 teamsfx-api in the future.
export interface ArmResourcePlugin {
  generateArmTemplates?: (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>>;
  updateArmTemplates?: (ctx: PluginContext) => Promise<Result<ArmTemplateResult, FxError>>;
}

export interface BicepOrchestrationTemplate {
  Content: string;
}

export interface BicepOrchestrationParameterTemplate extends BicepOrchestrationTemplate {
  ParameterJson?: Record<string, unknown>;
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
  ModuleTemplate?: BicepOrchestrationModuleTemplate;
  OutputTemplate?: BicepOrchestrationTemplate;
}

export interface ScaffoldArmTemplateResult extends Record<string, unknown> {
  Modules?: { [moduleFileName: string]: BicepModule };
  Orchestration: BicepOrchestration;
}

export interface ArmTemplateResult extends Record<string, unknown> {
  Provision?: {
    Orchestration: string;
    Reference?: Record<string, unknown>;
    Modules?: { [moduleFileName: string]: string };
  };
  Configuration?: { Orchestration?: string; Modules?: { [moduleFileName: string]: string } };
  Parameters?: Record<string, string>;
}
