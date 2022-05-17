// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assembleError, err, Inputs, Platform } from "@microsoft/teamsfx-api";
import { CoreSource } from "../error";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import {
  Component,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
} from "../../common/telemetry";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import { getResourceFolder } from "../../folder";
import { loadProjectSettings } from "./projectSettingsLoader";
import { needMigrateToArmAndMultiEnv } from "./projectMigrator";
import { needConsolidateLocalRemote } from "./consolidateLocalRemote";
import * as os from "os";
import {
  needMigrateToAadManifest,
  Permission,
  permissionsToRequiredResourceAccess,
} from "./MigrationUtils";
import { generateAadManifestTemplate } from "../generateAadManifestTemplate";

const LearnMore = "Learn More";
const LearnMoreLink = "https://aka.ms/teamsfx-aad-manifest";
let userCancelFlag = false;
const backupFolder = ".backup";
const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);
const upgradeReportName = "aad-manifest-change-logs.md";

export const AadManifestMigrationMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    await next();
  } else if (await needConsolidateLocalRemote(ctx)) {
    await next();
  } else if ((await needMigrateToAadManifest(ctx)) && checkMethod(ctx)) {
    await upgrade(ctx, next);
  } else {
    await next();
  }
};

async function upgrade(ctx: CoreHookContext, next: NextFunction) {
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
    const aadManifestPath = path.join(
      inputs.projectPath as string,
      "templates",
      "appPackage",
      "aad.template.json"
    );
    const projectSettingsJson = await fs.readJson(projectSettingsPath);
    await generateAadManifestTemplate(
      inputs.projectPath!,
      projectSettingsJson,
      requiredResourceAccess,
      true
    );

    fileList.push(aadManifestPath);

    await fs.writeJSON(projectSettingsPath, projectSettingsJson, { spaces: 4, EOL: os.EOL });

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigrationAddAADTemplate);

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

  postMigration(inputs);

  generateUpgradeReport(path.join(inputs.projectPath as string, backupFolder));

  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectAadManifestMigration);

  return true;
}

function checkMethod(ctx: CoreHookContext): boolean {
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}

async function postMigration(inputs: Inputs): Promise<void> {
  if (inputs.platform === Platform.VSCode) {
    const res = await TOOLS?.ui.showMessage(
      "info",
      getLocalizedString("core.aadManifestMigration.outputMsg"),
      false,
      "OK",
      LearnMore
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (answer === LearnMore) {
      TOOLS?.ui.openUrl(LearnMoreLink);
    }
  } else {
    TOOLS?.logProvider.info(
      getLocalizedString("core.aadManifestMigration.SuccessMessage", LearnMoreLink)
    );
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
