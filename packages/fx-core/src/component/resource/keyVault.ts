// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import { Bicep, ContextV3, FxError, InputsWithProjectPath, Result } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames, IdentityOutputs, KeyVaultOutputs } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.KeyVault)
export class KeyVaultResource extends AzureResource {
  readonly name = ComponentNames.KeyVault;
  readonly bicepModuleName = "keyVault";
  outputs = KeyVaultOutputs;
  finalOutputKeys = ["keyVaultResourceId", "m365ClientSecretReference", "botClientSecretReference"];
  templateContext = {
    identity: {
      principalId: IdentityOutputs.identityPrincipalId.bicepVariable,
    },
  };

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-key-vault",
      telemetryEventName: "generate-arm-templates",
      errorSource: "kv",
    }),
  ])
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
    return super.generateBicep(context, inputs);
  }
}
