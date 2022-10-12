// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Bicep, ContextV3, FxError, InputsWithProjectPath, Result } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames, IdentityOutputs } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.Identity)
export class IdentityResource extends AzureResource {
  readonly name = ComponentNames.Identity;
  readonly bicepModuleName = ComponentNames.Identity;
  outputs = IdentityOutputs;
  finalOutputKeys = ["identityResourceId", "identityName", "identityClientId"];

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-azure-identity",
      telemetryEventName: "generate-arm-templates",
      errorSource: "msi",
    }),
  ])
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    return super.generateBicep(context, inputs);
  }
}
