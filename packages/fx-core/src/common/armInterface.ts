// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Plugin } from "@microsoft/teamsfx-api";

export type ArmResourcePlugin = Pick<Plugin, "generateArmTemplates" | "updateArmTemplates">;

export type NamedArmResourcePlugin = { name: string } & ArmResourcePlugin;

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

export interface ArmTemplateResult extends Record<any, unknown> {
  Provision?: {
    Orchestration?: string;
    Reference?: Record<string, unknown>;
    Modules?: { [moduleFileName: string]: string };
  };
  Configuration?: { Orchestration?: string; Modules?: { [moduleFileName: string]: string } };
  Parameters?: Record<string, string>;
}
