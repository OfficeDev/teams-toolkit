// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  ProjectSettingsV3,
  Result,
  SystemError,
  Void,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { getLocalizedString } from "../../common/localizeUtils";
import { hasAAD, isMiniApp } from "../../common/projectSettingsHelperV3";
import { sendErrorTelemetryThenReturnError } from "../../core/telemetry";
import {
  ComponentNames,
  Language,
  SolutionError,
  SolutionSource,
  SolutionTelemetryComponentName,
  SolutionTelemetryEvent,
  SolutionTelemetryProperty,
  TelemetryConstants,
} from "../constants";
import { createAuthFiles } from "../resource/aadApp/utils";
import { getComponent } from "../workflow";

@Service("sso")
export class SSO {
  name = "sso";

  async add(context: ContextV3, inputs: InputsWithProjectPath): Promise<Result<any, FxError>> {
    return addSsoV3(context, inputs);
  }
}

async function addSsoV3(
  context: ContextV3,
  inputs: InputsWithProjectPath
): Promise<Result<any, FxError>> {
  context.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddSsoStart, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
  });

  const res = await createAuthFiles(inputs, Language.CSharp, false, false, true);
  if (res.isErr()) {
    return err(
      sendErrorTelemetryThenReturnError(
        SolutionTelemetryEvent.AddSso,
        res.error,
        context.telemetryReporter
      )
    );
  }

  context.telemetryReporter.sendTelemetryEvent(SolutionTelemetryEvent.AddSso, {
    [SolutionTelemetryProperty.Component]: SolutionTelemetryComponentName,
    [SolutionTelemetryProperty.Success]: TelemetryConstants.values.yes,
  });

  return ok(undefined);
}

export interface updateComponents {
  bot?: boolean;
  tab?: boolean;
  aad?: boolean;
}

/**
 * Check the components that should be update when add sso based on the project setting.
 * 1. it is triggered by enabled-sso tab project in create stage. Update tab and aad components.
 * 2. mini app is an existing tab app. Update aad only.
 * 3. general project. Check the tab and bot components.
 *    for bot component, message-extension and function hosting doesnot support sso.
 */
function getUpdateComponents(
  projectSetting: ProjectSettingsV3,
  scenario: SsoScenario
): updateComponents {
  if (scenario === SsoScenario.Create) {
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

  const update = getUpdateComponents(projectSettings, SsoScenario.AddSso);
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

export enum SsoScenario {
  Create = "create",
  AddFunction = "addFunction",
  AddSso = "addSso",
}
