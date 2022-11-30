// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  ok,
  ProjectSettings,
  SettingsFileName,
  SettingsFolderName,
  TemplateFolderName,
} from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { MigrationContext, V2TeamsfxFolder } from "./utils/migrationContext";
import { checkMethod, checkUserTasks } from "./projectMigrator";
import * as path from "path";
import { loadProjectSettingsByProjectPathV2 } from "./projectSettingsLoader";
import { AppYmlGenerator } from "./utils/appYmlGenerator";
import * as fs from "fs-extra";
import { MANIFEST_TEMPLATE_CONSOLIDATE } from "../../component/resource/appManifest/constants";
import { replacePlaceholdersForV3 } from "./MigrationUtils";
import { ReadFileError } from "../error";

const MigrationVersion = "2.1.0";
const Constants = {
  provisionBicepPath: "./templates/azure/provision.bicep",
  appYmlName: "app.yml",
};

type Migration = (context: MigrationContext) => Promise<void>;
const subMigrations: Array<Migration> = [
  preMigration,
  generateSettingsJson,
  generateAppYml,
  replacePlaceholderForManifests,
];

export const ProjectMigratorMWV3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if ((await checkVersionForMigration(ctx)) && checkMethod(ctx)) {
    if (!checkUserTasks(ctx)) {
      ctx.result = ok(undefined);
      return;
    }

    // TODO: add user confirm for migration
    const migrationContext = await MigrationContext.create(ctx);
    await wrapRunMigration(migrationContext, migrate);
    ctx.result = ok(undefined);
  } else {
    // continue next step only when:
    // 1. no need to upgrade the project;
    // 2. no need to update Teams Toolkit version;
    await next();
  }
};

export async function wrapRunMigration(
  context: MigrationContext,
  exec: (context: MigrationContext) => void
): Promise<void> {
  try {
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationStart);
    await exec(context);
    await showSummaryReport(context);
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationEnd);
  } catch (error: any) {
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationFailed);
    await rollbackMigration(context);
    throw error;
  }
}

async function rollbackMigration(context: MigrationContext): Promise<void> {
  await context.cleanModifiedPaths();
  await context.restoreBackup();
  await context.cleanTeamsfx();
}

async function showSummaryReport(context: MigrationContext): Promise<void> {}

async function migrate(context: MigrationContext): Promise<void> {
  for (const subMigration of subMigrations) {
    await subMigration(context);
  }
}

async function preMigration(context: MigrationContext): Promise<void> {
  await context.backup(V2TeamsfxFolder);
}

async function checkVersionForMigration(ctx: CoreHookContext): Promise<boolean> {
  const version = await getProjectVersion(ctx);
  return version === MigrationVersion;
}

// TODO: read the real version from project setting
async function getProjectVersion(ctx: CoreHookContext): Promise<string> {
  return "2.1.0";
}

export async function generateSettingsJson(context: MigrationContext): Promise<void> {
  const oldProjectSettings = await loadProjectSettings(context.projectPath);

  const content = {
    version: "3.0.0",
    trackingId: oldProjectSettings.projectId,
  };

  await context.fsEnsureDir(SettingsFolderName);
  await context.fsWriteFile(
    path.join(SettingsFolderName, SettingsFileName),
    JSON.stringify(content, null, 4)
  );
}

export async function generateAppYml(context: MigrationContext): Promise<void> {
  const bicepContent: string = await fs.readFile(
    path.join(context.projectPath, Constants.provisionBicepPath),
    "utf8"
  );
  const oldProjectSettings = await loadProjectSettings(context.projectPath);
  const appYmlGenerator = new AppYmlGenerator(oldProjectSettings, bicepContent);
  const appYmlString: string = await appYmlGenerator.generateAppYml();
  await context.fsWriteFile(path.join(SettingsFolderName, Constants.appYmlName), appYmlString);
}

async function loadProjectSettings(projectPath: string): Promise<ProjectSettings> {
  const oldProjectSettings = await loadProjectSettingsByProjectPathV2(projectPath, true);
  if (oldProjectSettings.isOk()) {
    return oldProjectSettings.value;
  } else {
    throw oldProjectSettings.error;
  }
}

export async function replacePlaceholderForManifests(context: MigrationContext): Promise<void> {
  // Backup templates/appPackage
  const oldAppPackageFolderPath = path.join(TemplateFolderName, AppPackageFolderName);
  const oldAppPackageFolderBackupRes = await context.backup(oldAppPackageFolderPath);

  if (!oldAppPackageFolderBackupRes) {
    // templates/appPackage does not exists
    // invalid teamsfx project
    throw ReadFileError(new Error("templates/appPackage does not exist"));
  }

  // Ensure appPackage
  await context.fsEnsureDir(AppPackageFolderName);

  // Copy templates/appPackage/resources
  const oldResourceFolderPath = path.join(oldAppPackageFolderPath, "resources");
  const oldResourceFolderExists = await fs.pathExists(
    path.join(context.projectPath, oldResourceFolderPath)
  );
  if (oldResourceFolderExists) {
    const resourceFolderPath = path.join(AppPackageFolderName, "resources");
    await context.fsCopy(oldResourceFolderPath, resourceFolderPath);
  }

  // Read Bicep
  const oldBicepFilePath = path.join(TemplateFolderName, "azure", "provision.bicep");
  const oldBicepFileExists = await fs.pathExists(path.join(context.projectPath, oldBicepFilePath));
  if (!oldBicepFileExists) {
    // templates/azure/provision.bicep does not exist
    throw ReadFileError(new Error("templates/azure/provision.bicep does not exist"));
  }
  const bicepContent = await fs.readFile(path.join(context.projectPath, oldBicepFilePath), "utf-8");

  // Read Teams app manifest and save to templates/appPackage/manifest.template.json
  const oldManifestPath = path.join(oldAppPackageFolderPath, MANIFEST_TEMPLATE_CONSOLIDATE);
  const oldManifestExists = await fs.pathExists(path.join(context.projectPath, oldManifestPath));
  if (oldManifestExists) {
    const manifestPath = path.join(AppPackageFolderName, MANIFEST_TEMPLATE_CONSOLIDATE);
    const oldManifest = await fs.readFile(path.join(context.projectPath, oldManifestPath), "utf8");
    const manifest = replacePlaceholdersForV3(oldManifest, bicepContent);
    // TODO: update app id uri
    await context.fsWriteFile(manifestPath, manifest);
  } else {
    // templates/appPackage/manifest.template.json does not exist
    throw ReadFileError(new Error("templates/appPackage/manifest.template.json does not exist"));
  }

  // Read AAD app manifest and save to ./aad.manifest.template.json
  const oldAadManifestPath = path.join(oldAppPackageFolderPath, "aad.template.json");
  const oldAadManifestExists = await fs.pathExists(
    path.join(context.projectPath, oldAadManifestPath)
  );
  if (oldAadManifestExists) {
    const oldAadManifest = await fs.readFile(
      path.join(context.projectPath, oldAadManifestPath),
      "utf-8"
    );
    const aadManifest = replacePlaceholdersForV3(oldAadManifest, bicepContent);
    // TODO: update app id uri
    await context.fsWriteFile("aad.manifest.template.json", aadManifest);
  }
}
