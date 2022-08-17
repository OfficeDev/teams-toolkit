// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  Result,
  Stage,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { getLocalizedString } from "../../common/localizeUtils";
import { convertToAlphanumericOnly } from "../../common/utils";
import {
  AddSsoParameters,
  AzureSolutionQuestionNames,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  TabOptionItem,
} from "../../plugins";
import "../connection/azureWebAppConfig";
import { ComponentNames } from "../constants";
import { generateLocalDebugSettings } from "../debug";
import { AadApp } from "../resource/aadApp/aadApp";
import { AppManifest } from "../resource/appManifest/appManifest";
import "../resource/azureSql";
import "../resource/identity";
import { generateConfigBiceps, bicepUtils } from "../utils";
import { getComponent } from "../workflow";

@Service("sso")
export class SSO {
  name = "sso";

  async add(context: ContextV3, inputs: InputsWithProjectPath): Promise<Result<any, FxError>> {
    const updates = getUpdateComponents(context, inputs);
    // generate manifest
    const aadApp = Container.get<AadApp>(ComponentNames.AadApp);
    {
      const res = await aadApp.generateManifest(context, inputs);
      if (res.isErr()) return err(res.error);
    }

    // config sso
    if (updates.aad) {
      context.projectSetting.components.push({
        name: ComponentNames.AadApp,
        provision: true,
        deploy: true,
      });
    }
    if (updates.tab) {
      const teamsTabComponent = getComponent(context.projectSetting, ComponentNames.TeamsTab);
      teamsTabComponent!.sso = true;
    }
    if (updates.bot) {
      const teamsBotComponent = getComponent(context.projectSetting, ComponentNames.TeamsBot);
      teamsBotComponent!.sso = true;
    }

    // generate bicep
    {
      const res = await aadApp.generateBicep(context, inputs);
      if (res.isErr()) return err(res.error);
      const bicepRes = await bicepUtils.persistBiceps(
        inputs.projectPath,
        convertToAlphanumericOnly(context.projectSetting.appName),
        res.value
      );
      if (bicepRes.isErr()) return bicepRes;
    }

    // generate auth files
    if (
      inputs.stage === Stage.addFeature &&
      inputs[AzureSolutionQuestionNames.Features] !== TabOptionItem.id
    ) {
      const res = await aadApp.generateAuthFiles(context, inputs, updates.tab!, updates.bot!);
      if (res.isErr()) return err(res.error);
    }

    // update app manifest
    {
      const capabilities: v3.ManifestCapability[] = [{ name: "WebApplicationInfo" }];
      const appManifest = Container.get<AppManifest>(ComponentNames.AppManifest);
      const res = await appManifest.addCapability(inputs, capabilities);
      if (res.isErr()) return err(res.error);
    }

    // local debug settings
    {
      const res = await generateLocalDebugSettings(context, inputs);
      if (res.isErr()) return err(res.error);
    }

    // generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) return err(res.error);
    }

    // show notification
    if (inputs.platform == Platform.VSCode) {
      context.userInteraction
        .showMessage(
          "info",
          getLocalizedString("core.addSso.learnMore", AddSsoParameters.LearnMore),
          false,
          AddSsoParameters.LearnMore
        )
        .then((result) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === AddSsoParameters.LearnMore) {
            context.userInteraction?.openUrl(AddSsoParameters.LearnMoreUrl);
            context.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddSsoReadme, {
              [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
            });
          }
        });
    } else if (inputs.platform == Platform.CLI) {
      await context.userInteraction.showMessage(
        "info",
        getLocalizedString("core.addSso.learnMore", AddSsoParameters.LearnMoreUrl),
        false
      );
    }

    return ok({
      func: AddSsoParameters.AddSso,
      capabilities: [
        ...(updates.tab ? [AddSsoParameters.Tab] : []),
        ...(updates.bot ? [AddSsoParameters.Bot] : []),
      ],
    });
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
