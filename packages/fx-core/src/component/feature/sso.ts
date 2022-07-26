// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  ContextV3,
  Effect,
  err,
  FxError,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Platform,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { convertToAlphanumericOnly } from "../../common/utils";
import "../connection/azureWebAppConfig";
import { ComponentNames } from "../constants";
import { generateLocalDebugSettings } from "../debug";
import { AadApp } from "../resource/aadApp/aadApp";
import { AppManifest } from "../resource/appManifest/appManifest";
import "../resource/azureSql";
import "../resource/identity";
import { generateConfigBiceps, persistBiceps } from "../utils";
import { getComponent } from "../workflow";

@Service("sso")
export class SSO {
  name = "sso";

  /**
   * 1. config sso/aad
   * 2. generate aad manifest
   * 3. genearte aad bicep
   * 4. genearte aad auth files
   * 5. update app manifest
   */
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    if (inputs.platform == Platform.CLI_HELP) {
      return ok(undefined);
    }
    const action: Action = {
      type: "function",
      name: "sso.add",
      execute: async (context, inputs) => {
        const aadConfig = getComponent(context.projectSetting, ComponentNames.AadApp);
        if (aadConfig) {
          return ok([]);
        }
        const effects: Effect[] = [];

        // generate manifest
        const aadApp = Container.get<AadApp>(ComponentNames.AadApp);
        {
          const res = await aadApp.generateManifest(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate aad manifest");
        }

        // generate bicep
        {
          const res = await aadApp.generateBicep(context, inputs);
          if (res.isErr()) return err(res.error);
          const bicepRes = await persistBiceps(
            inputs.projectPath,
            convertToAlphanumericOnly(context.projectSetting.appName),
            res.value
          );
          if (bicepRes.isErr()) return bicepRes;
          effects.push("generate aad bicep");
        }

        // generate config bicep
        {
          const res = await generateConfigBiceps(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate config biceps");
        }

        // generate auth files
        const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
        const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
        {
          const res = await aadApp.generateAuthFiles(
            context,
            inputs,
            teamsTabComponent !== undefined,
            teamsBotComponent !== undefined
          );
          if (res.isErr()) return err(res.error);
          effects.push("generate auth files");
        }
        // update app manifest
        {
          const capabilities: v3.ManifestCapability[] = [{ name: "WebApplicationInfo" }];
          const appManifest = Container.get<AppManifest>(ComponentNames.AppManifest);
          const res = await appManifest.addCapability(inputs, capabilities);
          if (res.isErr()) return err(res.error);
          effects.push("update app manifest");
        }

        // local debug settings
        {
          const res = await generateLocalDebugSettings(context, inputs);
          if (res.isErr()) return err(res.error);
          effects.push("generate local debug configs");
        }

        // config aad
        context.projectSetting.components.push({
          name: ComponentNames.AadApp,
          provision: true,
          deploy: true,
        });
        if (teamsBotComponent) {
          teamsBotComponent.sso = true;
        }
        if (teamsTabComponent) {
          teamsTabComponent.sso = true;
        }
        effects.push("config aad");
        return ok(effects);
      },
    };
    return ok(action);
  }
}

// function getTabApiComponent(
//   tabComponent: Component,
//   projectSettings: ProjectSettingsV3
// ): Component | undefined {
//   return getComponentByScenario(projectSettings, ComponentNames.Function, Scenarios.Api);
// }

// export interface updateComponents {
//   bot?: boolean;
//   botHostingConnectgion?: boolean;
//   tab?: boolean;
//   tabApiConnection?: boolean;
//   aad?: boolean;
// }

// function generateAuthFilesAction(updates: updateComponents): Action {
//   return {
//     name: "call:aad-app.generateAuthFiles",
//     type: "call",
//     required: true,
//     targetAction: "aad-app.generateAuthFiles",
//     inputs: {
//       needsBot: updates.bot,
//       needsTab: updates.tab,
//     },
//   } as Action;
// }

// function getUpdateComponents(context: ContextV3, inputs: InputsWithProjectPath): updateComponents {
//   if (inputs.stage === Stage.create) {
//     return {
//       tab: true,
//       aad: true,
//     };
//   }
//   let needsBot = false;
//   let needsBotHostingConnection = false;
//   let needsTab = false;
//   let needsTabApiConnection = false;
//   const aadComponent = getComponent(context.projectSetting, ComponentNames.AadApp);
//   const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
//   if (teamsBotComponent && !teamsBotComponent.sso) {
//     needsBot = teamsBotComponent.hosting !== ComponentNames.Function;
//   }
//   if (needsBot) {
//     const botHosting = teamsBotComponent?.hosting;
//     if (botHosting) {
//       const botHostingComponent = getHostingComponent(teamsBotComponent!, context.projectSetting);
//       needsBotHostingConnection = !botHostingComponent?.connections?.includes(
//         ComponentNames.AadApp
//       );
//     }
//   }
//   const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
//   if (teamsTabComponent && !teamsTabComponent.sso) {
//     needsTab = true;
//     const apiComponent = getTabApiComponent(teamsTabComponent, context.projectSetting);
//     needsTabApiConnection =
//       !!apiComponent && !apiComponent.connections?.includes(ComponentNames.AadApp);
//   }
//   return {
//     bot: needsBot,
//     botHostingConnectgion: needsBotHostingConnection,
//     tab: needsTab,
//     tabApiConnection: needsTabApiConnection,
//     aad: !aadComponent,
//   };
// }
