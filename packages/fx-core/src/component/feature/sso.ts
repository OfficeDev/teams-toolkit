// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
  Result,
  Stage,
  SystemError,
  UserError,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { isExistingTabApp, BotHostTypeName, BotHostTypes } from "../../common";
import { ResourcePlugins } from "../../common/constants";
import { getLocalizedString } from "../../common/localizeUtils";
import { hasBot } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
import { sendErrorTelemetryThenReturnError } from "../../core/telemetry";
import {
  AddSsoParameters,
  AzureSolutionQuestionNames,
  BotOptionItem,
  BotSsoItem,
  HostTypeOptionAzure,
  MessageExtensionItem,
  PluginNames,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  TabOptionItem,
  TabSsoItem,
} from "../../plugins";
import "../connection/azureWebAppConfig";
import { ComponentNames, TelemetryConstants } from "../constants";
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
    context.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddSsoStart, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    });

    const updates = getUpdateComponents(context.projectSetting, inputs.stage === Stage.create);
    // generate manifest
    const aadApp = Container.get<AadApp>(ComponentNames.AadApp);
    {
      const res = await aadApp.generateManifest(context, inputs);
      if (res.isErr()) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddSso,
            res.error,
            context.telemetryReporter
          )
        );
      }
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
      if (bicepRes.isErr()) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddSso,
            bicepRes.error,
            context.telemetryReporter
          )
        );
      }
    }

    // generate auth files
    if (
      inputs.stage === Stage.addFeature &&
      inputs[AzureSolutionQuestionNames.Features] !== TabOptionItem.id
    ) {
      const res = await aadApp.generateAuthFiles(context, inputs, updates.tab!, updates.bot!);
      if (res.isErr()) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddSso,
            res.error,
            context.telemetryReporter
          )
        );
      }
    }

    // update app manifest
    {
      const capabilities: v3.ManifestCapability[] = [{ name: "WebApplicationInfo" }];
      const appManifest = Container.get<AppManifest>(ComponentNames.AppManifest);
      const res = await appManifest.addCapability(inputs, capabilities);
      if (res.isErr()) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddSso,
            res.error,
            context.telemetryReporter
          )
        );
      }
    }

    // local debug settings
    {
      const res = await generateLocalDebugSettings(context, inputs);
      if (res.isErr()) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddSso,
            res.error,
            context.telemetryReporter
          )
        );
      }
    }

    // generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) {
        return err(
          sendErrorTelemetryThenReturnError(
            SolutionTelemetryEvent.AddSso,
            res.error,
            context.telemetryReporter
          )
        );
      }
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

    context.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddSso, {
      [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
      [SolutionTelemetryProperty.Success]: TelemetryConstants.values.yes,
      [SolutionTelemetryProperty.AddTabSso]: updates.tab
        ? TelemetryConstants.values.yes
        : TelemetryConstants.values.no,
      [SolutionTelemetryProperty.AddBotSso]: updates.bot
        ? TelemetryConstants.values.yes
        : TelemetryConstants.values.no,
    });

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
function getUpdateComponents(
  projectSetting: ProjectSettingsV3,
  isCreateStage: boolean
): updateComponents {
  if (isCreateStage) {
    return {
      tab: true,
      aad: true,
    };
  }
  let needsBot = false;
  let needsTab = false;
  const aadComponent = getComponent(projectSetting, ComponentNames.AadApp);
  const teamsBotComponent = getComponent(projectSetting, ComponentNames.TeamsBot);
  if (teamsBotComponent && !teamsBotComponent.sso) {
    if (
      teamsBotComponent.capabilities &&
      teamsBotComponent.capabilities.length === 1 &&
      teamsBotComponent.capabilities.includes("message-extension")
    ) {
      needsBot = false;
    } else {
      needsBot = teamsBotComponent.hosting !== ComponentNames.Function;
    }
  }
  const teamsTabComponent = getComponent(projectSetting, ComponentNames.TeamsTab);
  if (teamsTabComponent && !teamsTabComponent.sso) {
    needsTab = true;
  }
  return {
    bot: needsBot,
    tab: needsTab,
    aad: !aadComponent,
  };
}

export function canAddSso(
  projectSettings: ProjectSettingsV3,
  returnError = false
): boolean | Result<Void, FxError> {
  // TODO: support existing tab app with sso in v3

  const update = getUpdateComponents(projectSettings, false);
  if (update.tab || update.bot || update.aad) {
    return true;
  } else {
    const aadComponent = getComponent(projectSettings, ComponentNames.AadApp);
    const teamsBotComponent = getComponent(projectSettings, ComponentNames.TeamsBot);

    if (teamsBotComponent) {
      if (
        teamsBotComponent.capabilities &&
        teamsBotComponent.capabilities.length === 1 &&
        teamsBotComponent.capabilities.includes("message-extension")
      ) {
        return returnError
          ? err(
              new SystemError(
                SolutionSource,
                SolutionError.AddSsoNotSupported,
                getLocalizedString("core.addSso.onlyMeNotSupport")
              )
            )
          : false;
      }
      if (teamsBotComponent.hosting === ComponentNames.Function) {
        return returnError
          ? err(
              new SystemError(
                SolutionSource,
                SolutionError.AddSsoNotSupported,
                getLocalizedString("core.addSso.functionNotSupport")
              )
            )
          : false;
      }
    }

    if (aadComponent) {
      return returnError
        ? err(
            new SystemError(
              SolutionSource,
              SolutionError.SsoEnabled,
              getLocalizedString("core.addSso.ssoEnabled")
            )
          )
        : false;
    }
    return false;
  }
}
