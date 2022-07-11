// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  FunctionAction,
  FileEffect,
  PluginContext,
  EnvInfo,
  ConfigMap,
  ProvisionContextV3,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import {
  ComponentNames,
  ActionTypeFunction,
  ActionNames,
  ComponentStateKeys,
} from "../../../constants";
import { generateAadManifestTemplate } from "../../../../core/generateAadManifestTemplate";
import { AadAppForTeamsImpl } from "../../../../plugins/resource/aad/plugin";
import { getComponent } from "../../../workflow";

export function GetActionProvision(): FunctionAction {
  return {
    name: `${ComponentNames.AadApp}.${ActionNames.provision}`,
    type: ActionTypeFunction,
    plan: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      return ok([
        {
          type: "service",
          name: "teams.microsoft.com",
          remarks: "create or update aad app",
        },
      ]);
    },
    execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
      const ctx = context as ProvisionContextV3;
      ctx.envInfo!.state[ComponentStateKeys[ComponentNames.AadApp]] ??= {};
      const aadAppImplement = new AadAppForTeamsImpl();
      const convertCtx = convertContext(ctx, inputs);
      await aadAppImplement.provisionUsingManifest(convertCtx);

      const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
      convertState.forEach((v: any, k: string) => {
        ctx.envInfo!.state[ComponentStateKeys[ComponentNames.AadApp]][k] = v;
      });
      delete ctx.projectSetting.solutionSettings!.capabilities;

      return ok([
        {
          type: "service",
          name: "teams.microsoft.com",
          remarks: "create or update aad app",
        },
      ]);
    },
  };
}

export function convertContext(context: ContextV3, inputs: InputsWithProjectPath): PluginContext {
  const aadState = context.envInfo!.state[ComponentStateKeys[ComponentNames.AadApp]];
  const aadConvertState: any = {};
  const state = new Map<string, any>();
  Object.entries(aadState).forEach((entry) => {
    aadConvertState[entry[0]] = entry[1];
  });
  const value = ConfigMap.fromJSON(aadConvertState);
  state.set("fx-resource-aad-app-for-teams", value);
  const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
  const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
  context.projectSetting.solutionSettings ??= { name: "solution" };
  context.projectSetting.solutionSettings.capabilities = [];
  if (teamsBotComponent) {
    context.projectSetting.solutionSettings.capabilities.push("Bot");
  }
  if (teamsTabComponent) {
    context.projectSetting.solutionSettings.capabilities.push("Tab");
  }
  const pluginCtx: PluginContext = {
    cryptoProvider: context.cryptoProvider,
    config: new ConfigMap(),
    logProvider: context.logProvider,
    m365TokenProvider: context.tokenProvider?.m365TokenProvider,
    ui: context.userInteraction,
    projectSettings: context.projectSetting,
    permissionRequestProvider: context.permissionRequestProvider,
    root: inputs.projectPath,
    envInfo: {
      config: {
        manifest: {
          appName: {
            short: context.projectSetting.appName,
          },
        },
      },
      envName: inputs.env,
      state: state,
    } as EnvInfo,
  };
  return pluginCtx;
}
