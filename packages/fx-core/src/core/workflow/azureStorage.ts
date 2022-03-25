// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  FxError,
  Inputs,
  Json,
  ok,
  Platform,
  ProjectSettings,
  Result,
  TokenProvider,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import * as Handlebars from "handlebars";
import { assign, merge } from "lodash";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { createV2Context } from "../../common";
import { ensureSolutionSettings } from "../../plugins/solution/fx-solution/utils/solutionSettingsHelper";
import { setTools } from "../globalVars";
import {
  Action,
  AddInstanceAction,
  ResourcePlugin,
  GenerateBicepAction,
  GroupAction,
  MaybePromise,
  ProvisionAction,
} from "./interface";
import { MockTools } from "./utils";

@Service("azure-storage")
export class AzureStorageResource implements ResourcePlugin {
  name = "azure-storage";
  addInstance(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const addInstance: AddInstanceAction = {
      name: "azure-storage.addInstance",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `add an entry ${this.name} in projectSettings.solutionSettings.activeResourcePlugins`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        context.projectSetting.solutionSettings?.activeResourcePlugins.push(this.name);
        return ok(undefined);
      },
    };
    return ok(addInstance);
  }
  generateBicep(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const generateBicep: GenerateBicepAction = {
      name: "azure-storage.generateBicep",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("create azure storage bicep");
      },
      execute: async (
        context: v2.Context,
        inputs: Inputs
      ): Promise<Result<v3.BicepTemplate[], FxError>> => {
        return ok([]);
      },
    };
    return ok(generateBicep);
  }
  configure(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const configure: ProvisionAction = {
      name: "azure-storage.configure",
      type: "function",
      plan: (context: v2.Context, inputs: Inputs) => {
        return ok("configure azure storage (enable static web site)");
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("configure azure storage (enable static web site)");
        return ok(undefined);
      },
    };
    return ok(configure);
  }
}
