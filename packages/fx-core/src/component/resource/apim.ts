// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, err, FxError, InputsWithProjectPath, ok, Result } from "@microsoft/teamsfx-api";
import { ProvisionContextV3 } from "@microsoft/teamsfx-api/build/types";
import "reflect-metadata";
import { Service, Container } from "typedi";
import { ApimPluginV3 } from "../../plugins/resource/apim/v3";
import { BuiltInFeaturePluginNames } from "../../plugins/solution/fx-solution/v3/constants";
import { APIMOutputs, ComponentNames } from "../constants";
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
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Action | undefined, FxError>> {
    const ctx = context as ProvisionContextV3;
    const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
    const res = await apimV3.provisionResource(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
  async configure(
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ProvisionContextV3;
    const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
    const res = await apimV3.configureResource(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
  async deploy(
    context: ProvisionContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const ctx = context as ProvisionContextV3;
    const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
    const res = await apimV3.deploy(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
}
