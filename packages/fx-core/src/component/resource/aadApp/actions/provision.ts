// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  FunctionAction,
  PluginContext,
  EnvInfo,
  ConfigMap,
  ProvisionContextV3,
} from "@microsoft/teamsfx-api";
import { ComponentNames, ActionTypeFunction, ActionNames } from "../../../constants";
import { AadAppForTeamsImpl } from "../../../../plugins/resource/aad/plugin";
import { convertEnvStateV3ToV2, convertProjectSettingsV3ToV2 } from "../../../migrate";

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
      ctx.envInfo!.state[ComponentNames.AadApp] ??= {};
      const aadAppImplement = new AadAppForTeamsImpl();
      const convertCtx = convertContext(ctx, inputs);
      await aadAppImplement.provisionUsingManifest(convertCtx);

      const convertState = convertCtx.envInfo.state.get("fx-resource-aad-app-for-teams");
      convertState.forEach((v: any, k: string) => {
        ctx.envInfo!.state[ComponentNames.AadApp][k] = v;
      });

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
  const projectSetting = convertProjectSettingsV3ToV2(context.projectSetting);
  const stateV2 = convertEnvStateV3ToV2(context.envInfo!.state!);
  stateV2["fx-resource-aad-app-for-teams"] ??= {};
  const value = ConfigMap.fromJSON(stateV2);

  const pluginCtx: PluginContext = {
    cryptoProvider: context.cryptoProvider,
    config: new ConfigMap(),
    logProvider: context.logProvider,
    m365TokenProvider: context.tokenProvider?.m365TokenProvider,
    ui: context.userInteraction,
    projectSettings: projectSetting,
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
      state: value,
    } as EnvInfo,
  };
  return pluginCtx;
}
