// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assembleError, err, Inputs, Platform } from "@microsoft/teamsfx-api";
import { isConfigUnifyEnabled, isAadManifestEnabled } from "../../common/tools";
import { CoreSource, AadManifestMigrationCanceledError } from "../error";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import {
  Component,
  ProjectMigratorStatus,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import { getResourceFolder, getTemplatesFolder } from "../../folder";
import { loadProjectSettings } from "./projectSettingsLoader";
import { needMigrateToArmAndMultiEnv } from "./projectMigrator";
import { needConsolidateLocalRemote } from "./consolidateLocalRemote";
import {
  RequiredResourceAccess,
  AADManifest,
} from "../../plugins/resource/aad/interfaces/AADManifest";
import { Constants } from "../../plugins/resource/aad/constants";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import * as os from "os";

const upgradeButton = "Upgrade";
const LearnMore = "Learn More";
const LearnMoreLink = "https://aka.ms/teamsfx-aad-manifest";
let userCancelFlag = false;
const backupFolder = ".backup";
const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);
const upgradeReportName = "aad-manifest-change-logs.md";

interface Permission {
  resource: string;
  delegated: string[];
  application: string[];
}

export const AadManifestMigrationMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    await next();
  } else if (await needConsolidateLocalRemote(ctx)) {
    await next();
  } else if ((await needMigrateToAadManifest(ctx)) && checkMethod(ctx)) {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart);

    let showModal = true;
    if (ctx.method && methods.has(ctx.method)) {
      showModal = false;
    }
    if (showModal) {
      await upgrade(ctx, next, true);
    } else {
      upgrade(ctx, next, false);
    }
  } else {
    await next();
  }
};

async function upgrade(ctx: CoreHookContext, next: NextFunction, showModal: boolean) {
  let answer: string | undefined = undefined;
  do {
    const res = await TOOLS?.ui.showMessage(
      "warn",
      getLocalizedString("core.aadManifestMigration.Message"),
      showModal,
      upgradeButton,
      LearnMore
    );
    answer = res?.isOk() ? res.value : undefined;
    if (answer === LearnMore) {
      TOOLS?.ui.openUrl(LearnMoreLink);
    }
  } while (answer === LearnMore);
  if (!answer || answer != upgradeButton) {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationNotification, {
      [TelemetryProperty.Status]: ProjectMigratorStatus.Cancel,
    });
    ctx.result = err(AadManifestMigrationCanceledError());
    outputCancelMessage(ctx);
    return;
  }

  try {
    await migrate(ctx);
    await next();
  } catch (error) {
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.ProjectAadManifestMigrationError,
      assembleError(error, CoreSource)
    );
    throw error;
  }
}
async function needMigrateToAadManifest(ctx: CoreHookContext): Promise<boolean> {
  try {
    if (!isConfigUnifyEnabled() || !isAadManifestEnabled()) {
      return false;
    }

    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    if (!inputs.projectPath) {
      return false;
    }
    const fxExist = await fs.pathExists(path.join(inputs.projectPath as string, ".fx"));
    if (!fxExist) {
      return false;
    }

    const aadManifestTemplateExist = await fs.pathExists(
      path.join(inputs.projectPath as string, "templates", "appPackage", "aad.template.json")
    );

    if (aadManifestTemplateExist) {
      return false;
    }

    const permissionFileExist = await fs.pathExists(
      path.join(inputs.projectPath as string, "permissions.json")
    );
    const projectSettingsJson = await fs.readJson(
      path.join(inputs.projectPath as string, ".fx", "configs", "projectSettings.json")
    );
    const aadPluginIsActive = projectSettingsJson.solutionSettings.activeResourcePlugins.includes(
      PluginNames.AAD
    );

    if (!aadPluginIsActive || !permissionFileExist) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

function outputCancelMessage(ctx: CoreHookContext) {
  TOOLS?.logProvider.warning(getLocalizedString("core.aadManifestMigration.Canceled"));

  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (inputs.platform === Platform.VSCode) {
    TOOLS?.logProvider.warning(
      getLocalizedString("core.aadManifestMigration.VSCodeCanceledNotice")
    );
  } else {
    TOOLS?.logProvider.warning(getLocalizedString("core.aadManifestMigration.CLICanceledNotice"));
    TOOLS?.logProvider.warning(
      getLocalizedString("core.aadManifestMigration.CLINotReadyInstallLatestVersionNotice")
    );
  }
}

function permissionsToRequiredResourceAccess(permissions: Permission[]): RequiredResourceAccess[] {
  const result: RequiredResourceAccess[] = [];
  permissions.forEach((permission) => {
    const res: RequiredResourceAccess = {
      resourceAppId: permission.resource,
      resourceAccess: permission.application
        .map((item) => {
          return { id: item, type: "Role" };
        })
        .concat(
          permission.delegated.map((item) => {
            return { id: item, type: "Scope" };
          })
        ),
    };

    result.push(res);
  });
  return result;
}

async function migrate(ctx: CoreHookContext): Promise<boolean> {
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationStart);
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const fileList: Array<string> = [];
  const loadRes = await loadProjectSettings(inputs, true);
  if (loadRes.isErr()) {
    ctx.result = err(loadRes.error);
    return false;
  }

  const projectSettings = loadRes.value;
  const projectSettingsPath = path.join(
    inputs.projectPath as string,
    ".fx",
    "configs",
    "projectSettings.json"
  );
  const permissionFilePath = path.join(inputs.projectPath as string, "permissions.json");

  try {
    sendTelemetryEvent(
      Component.core,
      TelemetryEvent.ProjectAadManifestMigrationAddAADTemplateStart
    );
    // add aad.template.file
    const permissions = (await fs.readJson(permissionFilePath)) as Permission[];

    const requiredResourceAccess = permissionsToRequiredResourceAccess(permissions);

    const templatesFolder = getTemplatesFolder();
    const aadManifestTemplatePath = `${templatesFolder}/${Constants.aadManifestTemplateFolder}/${Constants.aadManifestTemplateName}`;
    const aadManifestJson: AADManifest = await fs.readJson(aadManifestTemplatePath);
    aadManifestJson.requiredResourceAccess = requiredResourceAccess;
    const aadManifestPath = path.join(
      inputs.projectPath as string,
      "templates",
      "appPackage",
      "aad.template.json"
    );
    const projectSettingsJson = await fs.readJson(projectSettingsPath);

    if (projectSettingsJson.solutionSettings.capabilities.includes("Tab")) {
      aadManifestJson.replyUrlsWithType.push({
        url: "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html",
        type: "Web",
      });

      aadManifestJson.replyUrlsWithType.push({
        url: "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/auth-end.html?clientId={{state.fx-resource-aad-app-for-teams.clientId}}",
        type: "Spa",
      });

      aadManifestJson.replyUrlsWithType.push({
        url: "{{state.fx-resource-aad-app-for-teams.frontendEndpoint}}/blank-auth-end.html",
        type: "Spa",
      });
    }

    if (projectSettingsJson.solutionSettings.capabilities.includes("Bot")) {
      aadManifestJson.replyUrlsWithType.push({
        url: "{{state.fx-resource-aad-app-for-teams.botEndpoint}}/auth-end.html",
        type: "Web",
      });
    }

    await fs.writeJSON(aadManifestPath, aadManifestJson, { spaces: 4, EOL: os.EOL });

    fileList.push(aadManifestPath);

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationAddAADTemplate);

    // add SSO
    sendTelemetryEvent(
      Component.core,
      TelemetryEvent.ProjectAadManifestMigrationAddSSOCapabilityStart
    );

    if (
      projectSettingsJson.solutionSettings.capabilities.includes("Tab") &&
      !projectSettingsJson.solutionSettings.capabilities.includes("TabSSO")
    ) {
      projectSettingsJson.solutionSettings.capabilities.push("TabSSO");
    }

    if (
      projectSettingsJson.solutionSettings.capabilities.includes("Bot") &&
      !projectSettingsJson.solutionSettings.capabilities.includes("BotSSO")
    ) {
      projectSettingsJson.solutionSettings.capabilities.push("BotSSO");
    }

    await fs.writeJSON(projectSettingsPath, projectSettingsJson, { spaces: 4, EOL: os.EOL });
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationAddSSOCapability);

    // backup
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationBackupStart);

    const backupPath = path.join(inputs.projectPath as string, backupFolder);
    await fs.ensureDir(path.join(backupPath, ".fx", "configs"));

    await fs.writeJSON(
      path.join(backupPath, ".fx", "configs", "projectSettings.json"),
      projectSettings,
      { spaces: 4, EOL: os.EOL }
    );
    fileList.push(path.join(backupPath, ".fx", "configs", "projectSettings.json"));
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationBackup);
  } catch (e) {
    for (const item of fileList) {
      await fs.remove(item);
    }
    await fs.writeJSON(projectSettingsPath, projectSettings, { spaces: 4, EOL: os.EOL });
    throw e;
  }

  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationAddAADTemplate);

  postMigration(inputs);

  generateUpgradeReport(path.join(inputs.projectPath as string, backupFolder));

  return true;
}

function checkMethod(ctx: CoreHookContext): boolean {
  const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}

async function postMigration(inputs: Inputs): Promise<void> {
  if (inputs.platform === Platform.VSCode) {
    await TOOLS?.ui.showMessage(
      "info",
      getLocalizedString("core.aadManifestMigration.outputMsg"),
      false,
      "OK"
    );
  } else {
    TOOLS?.logProvider.info(getLocalizedString("core.aadManifestMigration.SuccessMessage"));
  }
}

async function generateUpgradeReport(backupFolder: string) {
  try {
    const target = path.join(backupFolder, upgradeReportName);
    const source = path.resolve(path.join(getResourceFolder(), upgradeReportName));
    await fs.copyFile(source, target);
  } catch (error) {
    // do nothing
  }
}
