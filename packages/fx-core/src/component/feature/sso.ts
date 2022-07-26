// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  Effect,
  err,
  FunctionAction,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Result,
  Stage,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getComponent, runActionByName } from "../workflow";
import "../connection/azureWebAppConfig";
import "../resource/azureSql";
import "../resource/identity";
import { ComponentNames } from "../constants";
import { generateConfigBiceps } from "../utils";
import { cloneDeep, assign } from "lodash";

@Service("sso")
export class SSO {
  name = "sso";

  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: FunctionAction = {
      name: "sso.add",
      type: "function",
      execute: async (context, inputs) => {
        const effects: Effect[] = [];

        const updates = getUpdateComponents(context, inputs);
        // 1. aad-app.generateManifest
        {
          const res = await runActionByName("aad-app.generateManifest", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate aad manifest");
        }

        // 2. aad-app.generateBicep
        {
          const res = await runActionByName("aad-app.generateBicep", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate aad bicep files");
        }

        // 3. aad-app.generateAuthFiles
        if (inputs.stage === Stage.addFeature) {
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            needsBot: updates.bot,
            needsTab: updates.tab,
          });
          const res = await runActionByName("aad-app.generateAuthFiles", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          effects.push("add sso auth files");
        }

        // 4. app-manifest.addCapability
        {
          const clonedInputs = cloneDeep(inputs);
          assign(clonedInputs, {
            capabilities: [{ name: "WebApplicationInfo" }],
          });
          const res = await runActionByName("app-manifest.addCapability", context, clonedInputs);
          if (res.isErr()) return err(res.error);
          effects.push("add aad capability in app manifest");
        }

        // 5. local debug settings
        {
          const res = await runActionByName("debug.generateLocalDebugSettings", context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate local debug configs");
        }

        // 6. sso config
        if (updates.aad) {
          context.projectSetting.components.push({
            name: ComponentNames.AadApp,
            provision: true,
            deploy: true,
          });
          effects.push("add component 'aad-app' in projectSettings");
        }
        if (updates.tab) {
          const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
          teamsTabComponent!.sso = true;
          effects.push("add feature 'SSO' to component 'teams-tab' in projectSettings");
        }
        if (updates.bot) {
          const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
          teamsBotComponent!.sso = true;
          effects.push("add feature 'SSO' to component 'teams-bot' in projectSettings");
        }

        // 7. update config bicep
        {
          const res = await generateConfigBiceps(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate config biceps");
        }
        return ok(effects);
      },
    };
    return ok(action);
  }
}

export interface updateComponents {
  bot?: boolean;
  tab?: boolean;
  aad?: boolean;
}

function getUpdateComponents(context: ContextV3, inputs: InputsWithProjectPath): updateComponents {
  if (inputs.stage === Stage.create) {
    return {
      tab: true,
      aad: true,
    };
  }
  let needsBot = false;
  let needsTab = false;
  const aadComponent = getComponent(context.projectSetting, ComponentNames.AadApp);
  const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
  if (teamsBotComponent && !teamsBotComponent.sso) {
    needsBot = teamsBotComponent.hosting !== ComponentNames.Function;
  }
  const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
  if (teamsTabComponent && !teamsTabComponent.sso) {
    needsTab = true;
  }
  return {
    bot: needsBot,
    tab: needsTab,
    aad: !aadComponent,
  };
}
