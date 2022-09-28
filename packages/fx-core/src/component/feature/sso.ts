// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
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
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { getLocalizedString } from "../../common/localizeUtils";
import { hasAAD, isMiniApp } from "../../common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../common/utils";
import { sendErrorTelemetryThenReturnError } from "../../core/telemetry";
import {
  AddSsoParameters,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
} from "../../plugins/solution/fx-solution/constants";
import {
  AzureSolutionQuestionNames,
  SingleSignOnOptionItem,
} from "../../plugins/solution/fx-solution/question";
import "../connection/azureWebAppConfig";
import { ComponentNames, TelemetryConstants } from "../constants";
import { generateLocalDebugSettings } from "../debug";
import { AadApp } from "../resource/aadApp/aadApp";
import { AppManifest } from "../resource/appManifest/appManifest";
import { manifestUtils } from "../resource/appManifest/utils/ManifestUtils";
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

    const isCalledBySsoFeature =
      inputs.stage === Stage.addFeature &&
      inputs[AzureSolutionQuestionNames.Features] === SingleSignOnOptionItem.id;
    const updates = getUpdateComponents(context.projectSetting, isCalledBySsoFeature);
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
    if (isCalledBySsoFeature) {
      const isExistingTabAppRes = await manifestUtils.isExistingTab(inputs, context);
      if (isExistingTabAppRes.isErr()) return err(isExistingTabAppRes.error);
      const res = await aadApp.generateAuthFiles(
        context,
        inputs,
        updates.tab! || isExistingTabAppRes.value,
        updates.bot!
      );
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
    if (inputs.platform == Platform.VSCode && isCalledBySsoFeature) {
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
    } else if (inputs.platform == Platform.CLI && isCalledBySsoFeature) {
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

/**
 * Check the components that should be update when add sso based on the project setting.
 * 1. when it is not called by sso feture. It is triggered by enabled-sso tab project. Update tab and aad components.
 * 2. mini app is an existing tab app. Update aad only.
 * 3. general project. Check the tab and bot components.
 *    for bot component, message-extension and function hosting doesnot support sso.
 */
function getUpdateComponents(
  projectSetting: ProjectSettingsV3,
  isCalledBySsoFeature: boolean
): updateComponents {
  if (!isCalledBySsoFeature) {
    return {
      tab: true,
      aad: true,
    };
  }
  const hasAad = hasAAD(projectSetting);
  if (isMiniApp(projectSetting)) {
    return {
      aad: !hasAad,
    };
  }
  let needsBot = false;
  let needsTab = false;
  const teamsBotComponent = getComponent(projectSetting, ComponentNames.TeamsBot);
  if (
    teamsBotComponent &&
    !teamsBotComponent.sso &&
    teamsBotComponent.hosting !== ComponentNames.Function
  ) {
    needsBot = true;
  }
  const teamsTabComponent = getComponent(projectSetting, ComponentNames.TeamsTab);
  if (teamsTabComponent && !teamsTabComponent.sso) {
    needsTab = true;
  }
  return {
    bot: needsBot,
    tab: needsTab,
    aad: !hasAad,
  };
}

export function canAddSso(
  projectSettings: ProjectSettingsV3,
  returnError = false
): boolean | Result<Void, FxError> {
  const hasAad = hasAAD(projectSettings);
  if (isMiniApp(projectSettings)) {
    return !hasAad;
  }

  const update = getUpdateComponents(projectSettings, false);
  if (update.tab || update.bot) {
    return true;
  } else {
    const aadComponent = getComponent(projectSettings, ComponentNames.AadApp);
    const teamsBotComponent = getComponent(projectSettings, ComponentNames.TeamsBot);

    if (teamsBotComponent) {
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
