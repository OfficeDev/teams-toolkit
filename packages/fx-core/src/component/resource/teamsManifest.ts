// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FxError,
  ok,
  Result,
  Action,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { AppStudioPluginV3 } from "../../plugins/resource/appstudio/v3";
import { BuiltInFeaturePluginNames } from "../../plugins/solution/fx-solution/v3/constants";
import { ensureFilePlan } from "../workflow";
@Service("teams-manifest")
export class TeamsManifestResource {
  name = "teams-manifest";
  init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "teams-manifest.init",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const plans = [
          ensureFilePlan(
            path.join(inputs.projectPath, "templates", "appPackage", "resources", "color.png")
          ) as string,
          ensureFilePlan(
            path.join(inputs.projectPath, "templates", "appPackage", "resources", "outline.png")
          ) as string,
          ensureFilePlan(
            path.join(inputs.projectPath, "templates", "appPackage", "manifest.template.json")
          ) as string,
        ];
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
        const res = await appStudio.init(context, inputs);
        if (res.isErr()) return res;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  addCapability(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "teams-manifest.addCapability",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const teamsManifestInputs = inputs["teams-manifest"];
        return ok([
          `add capabilities (${JSON.stringify(
            teamsManifestInputs.capabilities
          )}) in manifest file: ${path.join(
            inputs.projectPath,
            "templates",
            "appPackage",
            "manifest.template.json"
          )}`,
        ]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const teamsManifestInputs = inputs["teams-manifest"];
        const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
        const addRes = await appStudio.addCapabilities(
          context,
          inputs,
          teamsManifestInputs.capabilities
        );
        if (addRes.isErr()) return addRes;
        return ok(undefined);
      },
    };
    return ok(action);
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "teams-manifest.provision",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok(["provision teams manifest"]);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
