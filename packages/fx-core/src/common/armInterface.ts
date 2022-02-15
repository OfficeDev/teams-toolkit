// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Plugin } from "@microsoft/teamsfx-api";

export type ArmResourcePlugin = Pick<Plugin, "generateArmTemplates" | "updateArmTemplates">;

export type NamedArmResourcePlugin = { name: string } & ArmResourcePlugin;

export interface ArmTemplateResult extends Record<any, unknown> {
  Provision?: {
    /*
    Content of this property will be appended to templates/azure/provision.bicep
    */
    Orchestration?: string;
    /*
    Content of each modules will be appended to templates/azure/provision/${moduleFileName}.bicep
    */
    Modules?: { [moduleFileName: string]: string };
  };
  Configuration?: {
    /*
    Content of this property will be appended to templates/azure/config.bicep
    */
    Orchestration?: string;
    /*
    Content of this property override each templates/azure/teamsFx/${moduleFileName}.bicep file
    */
    Modules?: { [moduleFileName: string]: string };
  };
  /*
  The reference values you provided here will be resolved by other resource plugins in run time
  You always need to provide full reference value list in generateArmTemplate/updateArmTemplate function call
  */
  Reference?: Record<string, unknown>;
  /*
  The parameters will be merged to .fx/configs/azure.parameters.{env}.json
  All environments will be updated when you provides this parameter
  */
  Parameters?: Record<string, string>;
}
