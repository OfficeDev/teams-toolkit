// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  InputsWithProjectPath,
  PluginContext,
  EnvInfo,
  ConfigMap,
} from "@microsoft/teamsfx-api";
import { convertEnvStateV3ToV2, convertProjectSettingsV3ToV2 } from "../../migrate";

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
