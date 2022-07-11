// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, err, FxError, InputsWithProjectPath, ok, Result } from "@microsoft/teamsfx-api";
import { ContextV3, MaybePromise, ProvisionContextV3 } from "@microsoft/teamsfx-api/build/types";
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

  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "apim.provision",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["apim.provision"]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
        const res = await apimV3.provisionResource(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
        if (res.isErr()) return err(res.error);
        return ok(["apim.provision"]);
      },
    };
    return ok(action);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "apim.configure",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["apim.configure"]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
        const res = await apimV3.configureResource(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
        if (res.isErr()) return err(res.error);
        return ok(["apim.configure"]);
      },
    };
    return ok(action);
  }
  deploy(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "apim.deploy",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["apim.deploy"]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const apimV3 = Container.get<ApimPluginV3>(BuiltInFeaturePluginNames.apim);
        const res = await apimV3.deploy(ctx, inputs, ctx.envInfo, ctx.tokenProvider);
        if (res.isErr()) return err(res.error);
        return ok(["apim.deploy"]);
      },
    };
    return ok(action);
  }
}
