// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  Action,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Result,
  ResourceContextV3,
  ContextV3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service, Container } from "typedi";
import { ApimPluginV3 } from "../../plugins/resource/apim/v3";
import { BuiltInFeaturePluginNames } from "../../plugins/solution/fx-solution/v3/constants";
import { APIMOutputs, ComponentNames } from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.APIM)
export class APIMResource extends AzureResource {
  readonly name = ComponentNames.APIM;
  readonly bicepModuleName = ComponentNames.APIM;
  outputs = APIMOutputs;
  finalOutputKeys = [
    "apimClientAADObjectId",
    "apimClientAADClientId",
    "apimClientAADClientSecret",
    "serviceResourceId",
    "productResourceId",
    "authServerResourceId",
  ];
  secretKeys = ["apimClientAADClientSecret"];

  async provision(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Action | undefined, FxError>> {
    if (context.envInfo.envName !== "local") {
      const ctx = context as ResourceContextV3;
      const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
      const res = await apimV3.provisionResource(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
      if (res.isErr()) return err(res.error);
    }
    return ok(undefined);
  }
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    if (context.envInfo.envName !== "local") {
      const ctx = context as ResourceContextV3;
      const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
      const res = await apimV3.configureResource(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
      if (res.isErr()) return err(res.error);
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      question: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
        return apimV3.getQuestionsForDeploy(
          context,
          inputs,
          context.envInfo!,
          context.tokenProvider!
        );
      },
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ResourceContextV3;
    const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
    const res = await apimV3.deploy(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
}
