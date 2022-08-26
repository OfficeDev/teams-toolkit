// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Bicep, ContextV3, FxError, InputsWithProjectPath, Result } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { PluginLifeCycle, ProjectConstants } from "../resource/apim/constants";
import { ComponentConnections } from "../utils";
import { AzureResourceConfig } from "./azureResourceConfig";
@Service("apim-config")
export class APIMConfig extends AzureResourceConfig {
  readonly name = "apim-config";
  readonly bicepModuleName = "apim";
  readonly requisite = "apim";
  references = ComponentConnections[ComponentNames.APIM];

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-apim",
      telemetryEventName: PluginLifeCycle.UpdateArmTemplates,
      errorSource: ProjectConstants.pluginShortName,
    }),
  ])
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    return super.generateBicep(context, inputs);
  }
}
