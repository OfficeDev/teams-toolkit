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
  FileEffect,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { AppStudioPluginV3 } from "../../plugins/resource/appstudio/v3";
import { BuiltInFeaturePluginNames } from "../../plugins/solution/fx-solution/v3/constants";
import { fileEffectPlanString } from "../utils";
@Service("teams-manifest")
export class TeamsManifestResource {
  name = "teams-manifest";
  init(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const createFilePath = [
      path.join(inputs.projectPath, "templates", "appPackage", "resources", "color.png"),
      path.join(inputs.projectPath, "templates", "appPackage", "resources", "outline.png"),
      path.join(inputs.projectPath, "templates", "appPackage", "manifest.template.json"),
    ];
    const effect: FileEffect = {
      type: "file",
      operate: "create",
      filePath: createFilePath,
    };
    const action: Action = {
      name: "teams-manifest.init",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        return ok([effect]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
        const res = await appStudio.init(context, inputs);
        if (res.isErr()) return res;
        return ok([effect]);
      },
    };
    return ok(action);
  }
  addCapability(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const effect: FileEffect = {
      type: "file",
      operate: "replace",
      filePath: path.join(inputs.projectPath, "templates", "appPackage", "manifest.template.json"),
    };
    const action: Action = {
      name: "teams-manifest.addCapability",
      type: "function",
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        effect.remarks = `add capabilities (${JSON.stringify(inputs.capabilities)}) in manifest`;
        return ok([effect]);
      },
      execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
        const addRes = await appStudio.addCapabilities(context, inputs, inputs.capabilities);
        if (addRes.isErr()) return addRes;
        effect.remarks = `add capabilities (${JSON.stringify(inputs.capabilities)}) in manifest`;
        return ok([effect]);
      },
    };
    return ok(action);
  }
  // provision(
  //   context: ContextV3,
  //   inputs: InputsWithProjectPath
  // ): MaybePromise<Result<Action | undefined, FxError>> {
  //   const action: Action = {
  //     name: "teams-manifest.provision",
  //     type: "function",
  //     plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
  //       return ok(["provision teams manifest"]);
  //     },
  //     execute: async (
  //       context: ContextV3,
  //       inputs: InputsWithProjectPath
  //     ): Promise<Result<undefined, FxError>> => {
  //       return ok(undefined);
  //     },
  //   };
  //   return ok(action);
  // }
}
