// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import Container, { Service } from "typedi";
import {
  Action,
  ContextV3,
  GroupAction,
  MaybePromise,
  ProjectSettingsV3,
  Resource,
  ResourceConfig,
  TeamsTabInputs,
  AzureResource,
} from "./interface";

/**
 * teams tab - feature level action
 */
@Service("teams-tab")
export class TeamsTabFeature implements Resource {
  name = "teams-tab";
  add(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
    const hostingResource = teamsTabInputs.hostingResource;
    const hostingResourcePlugin = Container.get(hostingResource) as Resource | AzureResource;
    const addHostingResourceMethod =
      (hostingResourcePlugin as AzureResource).type === "azure" ? "generateBicep" : "add";
    const actions: Action[] = [
      {
        name: "teams-tab.add",
        type: "function",
        plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
          const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
          return ok([
            `add resources: 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabInputs)}`,
          ]);
        },
        execute: async (
          context: ContextV3,
          inputs: v2.InputsWithProjectPath
        ): Promise<Result<undefined, FxError>> => {
          const teamsTabInputs = (inputs as TeamsTabInputs)["teams-tab"];
          const projectSettings = context.projectSetting as ProjectSettingsV3;
          const teamsTabResource: ResourceConfig = {
            name: "teams-tab",
            ...teamsTabInputs,
          };
          projectSettings.resources.push(teamsTabResource);
          console.log(
            `add resources: 'teams-tab' in projectSettings: ${JSON.stringify(teamsTabResource)}`
          );
          return ok(undefined);
        },
      },
      {
        name: "call:tab-scaffold.generateCode",
        type: "call",
        required: true,
        targetAction: "tab-scaffold.generateCode",
        inputs: {
          "tab-scaffold": teamsTabInputs,
        },
      },
      {
        name: `call:${teamsTabInputs.hostingResource}.${addHostingResourceMethod}`,
        type: "call",
        required: true,
        targetAction: `${teamsTabInputs.hostingResource}.${addHostingResourceMethod}`,
      },
      {
        name: "call:teams-manifest.addCapability",
        type: "call",
        required: true,
        targetAction: "teams-manifest.addCapability",
        inputs: {
          "teams-manifest": {
            capabilities: [{ name: "staticTab" }],
          },
        },
      },
    ];
    const group: GroupAction = {
      type: "group",
      name: "teams-tab.add",
      mode: "parallel",
      actions: actions,
    };
    return ok(group);
  }
}
