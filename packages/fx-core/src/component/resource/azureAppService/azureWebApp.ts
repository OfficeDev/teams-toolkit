// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, InputsWithProjectPath, ResourceContextV3, Result } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { ComponentNames, IdentityOutputs, WebAppOutputs } from "../../constants";
import { AzureAppService } from "./azureAppService";
@Service("azure-web-app")
export class AzureWebAppResource extends AzureAppService {
  readonly name = "azure-web-app";
  readonly alias = "WebApp";
  readonly displayName = "Azure Web App";
  readonly bicepModuleName = "azureWebApp";
  readonly outputs = WebAppOutputs;
  readonly finalOutputKeys = ["resourceId", "endpoint"];
  templateContext = {
    identity: {
      resourceId: IdentityOutputs.identityResourceId.bicepVariable,
    },
  };

  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    let resourceIdKey = this.outputs.resourceId.key;
    const state = context.envInfo.state[inputs.componentId];
    if (!state[resourceIdKey]) {
      if (state["botWebAppResourceId"]) {
        resourceIdKey = "botWebAppResourceId";
      }
      if (state["webAppResourceId"]) {
        resourceIdKey = "webAppResourceId";
      }
    }
    return await super.deploy(context, inputs, false, resourceIdKey);
  }
}
