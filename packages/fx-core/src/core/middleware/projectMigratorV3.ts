// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author xzf0587 <zhaofengxu@microsoft.com>
 */
import {
  AppPackageFolderName,
  err,
  FxError,
  ok,
  ProjectSettings,
  SystemError,
  UserError,
  InputConfigsFolderName,
  Platform,
  AzureSolutionSettings,
  ProjectSettingsV3,
  Inputs,
} from "@microsoft/teamsfx-api";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { CoreHookContext } from "../types";
import { backupFolder, MigrationContext } from "./utils/migrationContext";
import { checkMethod, checkUserTasks, learnMoreText, upgradeButton } from "./projectMigrator";
import * as path from "path";
import { loadProjectSettingsByProjectPathV2 } from "./projectSettingsLoader";
import {
  Component,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
} from "../../common/telemetry";
import { ErrorConstants } from "../../component/constants";
import { globalVars, TOOLS } from "../globalVars";
import {
  UpgradeV3CanceledError,
  MigrationError,
  AbandonedProjectError,
  ToolkitNotSupportError,
  NotAllowedMigrationError,
} from "../error";
import { AppYmlGenerator } from "./utils/appYmlGenerator";
import * as fs from "fs-extra";
import { MANIFEST_TEMPLATE_CONSOLIDATE } from "../../component/resource/appManifest/constants";
import { replacePlaceholdersForV3, FileType } from "./utils/MigrationUtils";
import {
  readAndConvertUserdata,
  fsReadDirSync,
  generateAppIdUri,
  getProjectVersion,
  jsonObjectNamesConvertV3,
  getCapabilitySsoStatus,
  readBicepContent,
  readJsonFile,
  replaceAppIdUri,
  updateAndSaveManifestForSpfx,
  getTemplateFolderPath,
  getParameterFromCxt,
  migrationNotificationMessage,
  outputCancelMessage,
  getDownloadLinkByVersionAndPlatform,
  getVersionState,
  getTrackingIdFromPath,
  buildEnvUserFileName,
  tryExtractEnvFromUserdata,
  buildEnvFileName,
} from "./utils/v3MigrationUtils";
import * as commentJson from "comment-json";
import { DebugMigrationContext } from "./utils/debug/debugMigrationContext";
import {
  getPlaceholderMappings,
  isCommentObject,
  launchRemote,
  OldProjectSettingsHelper,
  readJsonCommentFile,
} from "./utils/debug/debugV3MigrationUtils";
import {
  migrateTransparentLocalTunnel,
  migrateTransparentPrerequisite,
  migrateTransparentNpmInstall,
  migrateSetUpTab,
  migrateSetUpSSO,
  migratePrepareManifest,
  migrateSetUpBot,
  migrateValidateDependencies,
  migrateBackendExtensionsInstall,
  migrateFrontendStart,
  migrateValidateLocalPrerequisites,
  migrateNgrokStartTask,
  migrateNgrokStartCommand,
  migrateBotStart,
  migrateAuthStart,
  migrateBackendWatch,
  migrateBackendStart,
  migratePreDebugCheck,
  migrateInstallAppInTeams,
} from "./utils/debug/taskMigrator";
import { AppLocalYmlGenerator } from "./utils/debug/appLocalYmlGenerator";
import { EOL } from "os";
import { getTemplatesFolder } from "../../folder";
import { MetadataV2, MetadataV3, VersionSource, VersionState } from "../../common/versionMetadata";
import { isSPFxProject, isV3Enabled } from "../../common/tools";
import { VersionForMigration } from "./types";
import { environmentManager } from "../environment";
import { getLocalizedString } from "../../common/localizeUtils";
import { HubName, LaunchBrowser, LaunchUrl } from "../../component/debug/constants";

export const Constants = {
  vscodeProvisionBicepPath: "./templates/azure/provision.bicep",
  launchJsonPath: ".vscode/launch.json",
  tasksJsonPath: ".vscode/tasks.json",
  reportName: "upgradeReport.md",
  envWriteOption: {
    // .env.{env} file might be already exist, use append mode (flag: a+)
    encoding: "utf8",
    flag: "a+",
  },
  envFilePrefix: ".env.",
};

export const Parameters = {
  skipUserConfirm: "skipUserConfirm",
  isNonmodalMessage: "isNonmodalMessage",
  confirmOnly: "confirmOnly",
};

export const TelemetryPropertyKey = {
  button: "button",
  mode: "mode",
  upgradeVersion: "upgrade-version",
};

export const TelemetryPropertyValue = {
  ok: "ok",
  learnMore: "learn-more",
  cancel: "cancel",
  modal: "modal",
  nonmodal: "nonmodal",
  confirmOnly: "confirm-only",
  skipUserConfirm: "skip-user-confirm",
  upgradeVersion: "5.0",
};

export const learnMoreLink = "https://aka.ms/teams-toolkit-5.0-upgrade";

// MigrationError provides learnMoreLink as helplink for user. Remember add related error message in learnMoreLink when adding new error.
export const errorNames = {
  appPackageNotExist: "AppPackageNotExist",
  manifestTemplateNotExist: "ManifestTemplateNotExist",
  aadManifestTemplateNotExist: "AadManifestTemplateNotExist",
};
export const moreInfoButton = getLocalizedString("core.option.moreInfo");
const migrationMessageButtons = [upgradeButton, moreInfoButton];

type Migration = (context: MigrationContext) => Promise<void>;
const subMigrations: Array<Migration> = [
  preMigration,
  manifestsMigration,
  generateAppYml,
  generateLocalConfig,
  configsMigration,
  statesMigration,
  userdataMigration,
  generateApimPluginEnvContent,
  updateLaunchJson,
  azureParameterMigration,
  debugMigration,
  updateGitignore,
];

export const ProjectMigratorMWV3: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const versionForMigration = await checkVersionForMigration(ctx);
  // abandoned v3 project which will not be supported. Show user the message to create new project.
  if (versionForMigration.source === VersionSource.settings) {
    await TOOLS?.ui.showMessage(
      "warn",
      getLocalizedString("core.migrationV3.abandonedProject"),
      true
    );
    ctx.result = err(AbandonedProjectError());
    return;
  } else if (versionForMigration.state === VersionState.upgradeable && checkMethod(ctx)) {
    if (!checkUserTasks(ctx)) {
      ctx.result = ok(undefined);
      return;
    }
    if (!isV3Enabled()) {
      await TOOLS?.ui.showMessage(
        "warn",
        getLocalizedString("core.migrationV3.CreateNewProject"),
        true
      );
      ctx.result = err(ToolkitNotSupportError());
      return false;
    }

    // in cli non interactive scenario, migration will return an error instead of popup dialog.
    const nonInteractive = getParameterFromCxt(ctx, "nonInteractive");
    if (nonInteractive) {
      ctx.result = err(new NotAllowedMigrationError());
      return;
    }

    await ensureTrackingIdInGlobal(ctx);

    const isRunMigration = await showNotification(ctx, versionForMigration);
    if (isRunMigration) {
      const isNonmodalMessage = getParameterFromCxt(ctx, Parameters.isNonmodalMessage);
      if (isNonmodalMessage) {
        const versionForMigration = await checkVersionForMigration(ctx);
        if (versionForMigration.state !== VersionState.upgradeable) {
          ctx.result = ok(undefined);
          return;
        }
      }
      const migrationContext = await MigrationContext.create(ctx);
      await wrapRunMigration(migrationContext, migrate);
      ctx.result = ok(undefined);
    }
    return;
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
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateStart, {
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
    });
    await exec(context);
    await showSummaryReport(context);
    sendTelemetryEvent(
      Component.core,
      TelemetryEvent.ProjectMigratorMigrate,
      context.telemetryProperties
    );
  } catch (error: any) {
    let fxError: FxError;
    if (error instanceof UserError || error instanceof SystemError) {
      fxError = error;
    } else {
      if (!(error instanceof Error)) {
        error = new Error(error.toString());
      }
      fxError = new SystemError({
        error,
        source: Component.core,
        name: ErrorConstants.unhandledError,
        message: error.message,
        displayMessage: error.message,
      });
    }
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.ProjectMigratorError,
      fxError,
      context.telemetryProperties
    );
    await rollbackMigration(context);
    throw error;
  }
  await context.removeFxV2();
}

async function rollbackMigration(context: MigrationContext): Promise<void> {
  await context.cleanModifiedPaths();
  await context.restoreBackup();
  await context.cleanBackup();
}

async function showSummaryReport(context: MigrationContext): Promise<void> {
  const summaryPath = path.join(context.backupPath, Constants.reportName);
  const templatePath = path.join(getTemplatesFolder(), "core/v3Migration", Constants.reportName);

  const content = await fs.readFile(templatePath);
  await fs.writeFile(summaryPath, content);
  await TOOLS?.ui?.openFile?.(summaryPath);
}

export async function migrate(context: MigrationContext): Promise<void> {
  for (const subMigration of subMigrations) {
    await subMigration(context);
  }
}

async function preMigration(context: MigrationContext): Promise<void> {
  await context.backup(MetadataV2.configFolder);
}

export async function checkVersionForMigration(ctx: CoreHookContext): Promise<VersionForMigration> {
  const versionInfo = await getProjectVersion(ctx);
  const versionState = getVersionState(versionInfo);
  const platform = getParameterFromCxt(ctx, "platform", Platform.VSCode) as Platform;

  return {
    currentVersion: versionInfo.version,
    source: versionInfo.source,
    state: versionState,
    platform: platform,
  };
}

export async function generateAppYml(context: MigrationContext): Promise<void> {
  const bicepContent: string = await readBicepContent(context);
  const oldProjectSettings = await loadProjectSettings(context.projectPath);
  const appYmlGenerator = new AppYmlGenerator(
    oldProjectSettings,
    bicepContent,
    context.projectPath
  );
  const appYmlString: string = await appYmlGenerator.generateAppYml();
  await context.fsWriteFile(MetadataV3.configFile, appYmlString);
  if (oldProjectSettings.programmingLanguage?.toLowerCase() === "csharp") {
    const placeholderMappings = await getPlaceholderMappings(context);
    const appLocalYmlString: string = await appYmlGenerator.generateAppLocalYml(
      placeholderMappings
    );
    await context.fsWriteFile(MetadataV3.localConfigFile, appLocalYmlString);
  }
}

export async function updateLaunchJson(context: MigrationContext): Promise<void> {
  const launchJsonPath = path.join(context.projectPath, Constants.launchJsonPath);
  if (await fs.pathExists(launchJsonPath)) {
    await context.backup(Constants.launchJsonPath);
    let launchJsonContent = await fs.readFile(launchJsonPath, "utf8");
    const oldProjectSettings = await loadProjectSettings(context.projectPath);
    if (oldProjectSettings.isM365) {
      const jsonObject = JSON.parse(launchJsonContent);
      jsonObject.configurations.push(
        launchRemote(HubName.teams, LaunchBrowser.edge, "Edge", LaunchUrl.teamsRemote, 1)
      );
      jsonObject.configurations.push(
        launchRemote(HubName.teams, LaunchBrowser.chrome, "Chrome", LaunchUrl.teamsRemote, 1)
      );
      if (OldProjectSettingsHelper.includeTab(oldProjectSettings)) {
        jsonObject.configurations.push(
          launchRemote(HubName.outlook, LaunchBrowser.edge, "Edge", LaunchUrl.outlookRemoteTab, 2)
        );
        jsonObject.configurations.push(
          launchRemote(
            HubName.outlook,
            LaunchBrowser.chrome,
            "Chrome",
            LaunchUrl.outlookRemoteTab,
            2
          )
        );
        jsonObject.configurations.push(
          launchRemote(HubName.office, LaunchBrowser.edge, "Edge", LaunchUrl.officeRemoteTab, 3)
        );
        jsonObject.configurations.push(
          launchRemote(HubName.office, LaunchBrowser.chrome, "Chrome", LaunchUrl.officeRemoteTab, 3)
        );
      } else if (OldProjectSettingsHelper.includeBot(oldProjectSettings)) {
        jsonObject.configurations.push(
          launchRemote(HubName.outlook, LaunchBrowser.edge, "Edge", LaunchUrl.outlookRemoteBot, 2)
        );
        jsonObject.configurations.push(
          launchRemote(
            HubName.outlook,
            LaunchBrowser.chrome,
            "Chrome",
            LaunchUrl.outlookRemoteBot,
            2
          )
        );
      }
      launchJsonContent = JSON.stringify(jsonObject, null, 4);
    }
    const result = launchJsonContent
      .replace(/\${teamsAppId}/g, "${{TEAMS_APP_ID}}")
      .replace(/\${teamsAppInternalId}/g, "${{M365_APP_ID}}") // For M365 apps
      .replace(/\${localTeamsAppId}/g, "${{local:TEAMS_APP_ID}}")
      .replace(/\${localTeamsAppInternalId}/g, "${{local:M365_APP_ID}}"); // For M365 apps
    await context.fsWriteFile(Constants.launchJsonPath, result);
  }
}

async function loadProjectSettings(projectPath: string): Promise<ProjectSettings> {
  const oldProjectSettings = await loadProjectSettingsByProjectPathV2(projectPath, true, true);
  if (oldProjectSettings.isOk()) {
    return oldProjectSettings.value;
  } else {
    throw oldProjectSettings.error;
  }
}

export async function manifestsMigration(context: MigrationContext): Promise<void> {
  // Backup templates/appPackage
  const oldAppPackageFolderPath = path.join(getTemplateFolderPath(context), AppPackageFolderName);
  const oldAppPackageFolderBackupRes = await context.backup(oldAppPackageFolderPath);

  if (!oldAppPackageFolderBackupRes) {
    // templates/appPackage does not exists
    // invalid teamsfx project
    throw MigrationError(
      new Error("templates/appPackage does not exist"),
      errorNames.appPackageNotExist,
      learnMoreLink
    );
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
  const bicepContent = await readBicepContent(context);

  // Read capability project settings
  const projectSettings = await loadProjectSettings(context.projectPath);
  const capabilities = getCapabilitySsoStatus(projectSettings);
  const appIdUri = generateAppIdUri(capabilities);
  const isSpfx = isSPFxProject(projectSettings);

  // Read Teams app manifest and save to templates/appPackage/manifest.json
  const oldManifestPath = path.join(oldAppPackageFolderPath, MANIFEST_TEMPLATE_CONSOLIDATE);
  const oldManifestExists = await fs.pathExists(path.join(context.projectPath, oldManifestPath));
  if (oldManifestExists) {
    const manifestPath = path.join(AppPackageFolderName, MetadataV3.teamsManifestFileName);
    let oldManifest = await fs.readFile(path.join(context.projectPath, oldManifestPath), "utf8");
    oldManifest = replaceAppIdUri(oldManifest, appIdUri);
    const manifest = replacePlaceholdersForV3(oldManifest, bicepContent);
    if (isSpfx) {
      await updateAndSaveManifestForSpfx(context, manifest);
    } else {
      await context.fsWriteFile(manifestPath, manifest);
    }
  } else {
    // templates/appPackage/manifest.template.json does not exist
    throw MigrationError(
      new Error(getLocalizedString("core.migrationV3.manifestNotExist")),
      errorNames.manifestTemplateNotExist,
      learnMoreLink
    );
  }

  // Read AAD app manifest and save to ./aad.manifest.json
  const oldAadManifestPath = path.join(oldAppPackageFolderPath, "aad.template.json");
  const oldAadManifestExists = await fs.pathExists(
    path.join(context.projectPath, oldAadManifestPath)
  );

  const activeResourcePlugins = (projectSettings.solutionSettings as AzureSolutionSettings)
    .activeResourcePlugins;
  const component = (projectSettings as ProjectSettingsV3).components;
  const aadRequired =
    (activeResourcePlugins && activeResourcePlugins.includes("fx-resource-aad-app-for-teams")) ||
    (component &&
      component.findIndex((component, index, obj) => {
        return component.name == "aad-app";
      }) >= 0);

  if (oldAadManifestExists && aadRequired) {
    let oldAadManifest = await fs.readFile(
      path.join(context.projectPath, oldAadManifestPath),
      "utf-8"
    );
    oldAadManifest = replaceAppIdUri(oldAadManifest, appIdUri);
    const aadManifest = replacePlaceholdersForV3(oldAadManifest, bicepContent);
    await context.fsWriteFile(MetadataV3.aadManifestFileName, aadManifest);
  } else if (aadRequired && !oldAadManifestExists) {
    throw MigrationError(
      new Error(getLocalizedString("core.migrationV3.aadManifestNotExist")),
      errorNames.aadManifestTemplateNotExist,
      learnMoreLink
    );
  }

  await context.fsRemove(oldAppPackageFolderPath);
}

export async function azureParameterMigration(context: MigrationContext): Promise<void> {
  // Ensure `.fx/configs` exists
  const configFolderPath = path.join(".fx", InputConfigsFolderName);
  const configFolderPathExists = await context.fsPathExists(configFolderPath);
  if (!configFolderPathExists) {
    // Keep same practice now. Needs dicussion whether to throw error.
    return;
  }

  // Read Bicep
  const azureFolderPath = path.join(getTemplateFolderPath(context), "azure");
  const bicepContent = await readBicepContent(context);

  const fileNames = fsReadDirSync(context, configFolderPath);
  for (const fileName of fileNames) {
    if (!fileName.startsWith("azure.parameters.")) {
      continue;
    }

    const content = await fs.readFile(
      path.join(context.projectPath, configFolderPath, fileName),
      "utf-8"
    );

    const newContent = replacePlaceholdersForV3(content, bicepContent);
    await context.fsWriteFile(path.join(azureFolderPath, fileName), newContent);
  }
}

export async function showNotification(
  ctx: CoreHookContext,
  versionForMigration: VersionForMigration
): Promise<boolean> {
  const isNonmodalMessage = getParameterFromCxt(ctx, Parameters.isNonmodalMessage);
  if (isNonmodalMessage) {
    return await showNonmodalNotification(ctx, versionForMigration);
  }
  const confirmOnly = getParameterFromCxt(ctx, Parameters.confirmOnly);
  if (confirmOnly) {
    return await showConfirmOnlyNotification(ctx);
  }
  const skipUserConfirm = getParameterFromCxt(ctx, Parameters.skipUserConfirm);
  if (skipUserConfirm) {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryPropertyKey.button]: TelemetryPropertyValue.ok,
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
      [TelemetryPropertyKey.mode]: TelemetryPropertyValue.skipUserConfirm,
    });
    return true;
  }
  return await askUserConfirm(ctx, versionForMigration);
}

export async function askUserConfirm(
  ctx: CoreHookContext,
  versionForMigration: VersionForMigration
): Promise<boolean> {
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart, {
    [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
  });
  let answer;
  do {
    answer = await popupMessageModal(versionForMigration);
    if (answer === moreInfoButton) {
      TOOLS?.ui!.openUrl(learnMoreLink);
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
        [TelemetryPropertyKey.button]: TelemetryPropertyValue.learnMore,
        [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
        [TelemetryPropertyKey.mode]: TelemetryPropertyValue.modal,
      });
    }
  } while (answer === moreInfoButton);
  if (!answer || !migrationMessageButtons.includes(answer)) {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryPropertyKey.button]: TelemetryPropertyValue.cancel,
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
      [TelemetryPropertyKey.mode]: TelemetryPropertyValue.modal,
    });
    ctx.result = err(UpgradeV3CanceledError());
    outputCancelMessage(versionForMigration.currentVersion, versionForMigration.platform);
    return false;
  }
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
    [TelemetryPropertyKey.button]: TelemetryPropertyValue.ok,
    [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
    [TelemetryPropertyKey.mode]: TelemetryPropertyValue.modal,
  });
  return true;
}

export async function showNonmodalNotification(
  ctx: CoreHookContext,
  versionForMigration: VersionForMigration
): Promise<boolean> {
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart, {
    [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
  });
  const answer = await popupMessageNonmodal(versionForMigration);
  if (answer === moreInfoButton) {
    TOOLS?.ui!.openUrl(learnMoreLink);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryPropertyKey.button]: TelemetryPropertyValue.learnMore,
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
      [TelemetryPropertyKey.mode]: TelemetryPropertyValue.nonmodal,
    });
    return false;
  } else if (answer === upgradeButton) {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryPropertyKey.button]: TelemetryPropertyValue.ok,
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
      [TelemetryPropertyKey.mode]: TelemetryPropertyValue.nonmodal,
    });
    return true;
  }
  return false;
}

export async function showConfirmOnlyNotification(ctx: CoreHookContext): Promise<boolean> {
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart, {
    [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
  });
  const res = await TOOLS?.ui.showMessage(
    "info",
    getLocalizedString("core.migrationV3.confirmOnly.Message"),
    true,
    "OK"
  );
  if (res?.isOk() && res.value === "OK") {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryPropertyKey.button]: TelemetryPropertyValue.ok,
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
      [TelemetryPropertyKey.mode]: TelemetryPropertyValue.confirmOnly,
    });
    return true;
  } else {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryPropertyKey.button]: TelemetryPropertyValue.cancel,
      [TelemetryPropertyKey.upgradeVersion]: TelemetryPropertyValue.upgradeVersion,
      [TelemetryPropertyKey.mode]: TelemetryPropertyValue.confirmOnly,
    });
    return false;
  }
}

export async function popupMessageModal(
  versionForMigration: VersionForMigration
): Promise<string | undefined> {
  return await popupMessage(versionForMigration, true);
}

export async function popupMessageNonmodal(
  versionForMigration: VersionForMigration
): Promise<string | undefined> {
  return await popupMessage(versionForMigration, false);
}

export async function popupMessage(
  versionForMigration: VersionForMigration,
  isModal: boolean
): Promise<string | undefined> {
  const res = await TOOLS?.ui.showMessage(
    "warn",
    migrationNotificationMessage(versionForMigration),
    isModal,
    ...migrationMessageButtons
  );
  return res?.isOk() ? res.value : undefined;
}

export async function generateLocalConfig(context: MigrationContext): Promise<void> {
  if (!(await context.fsPathExists(path.join(".fx", "configs", "config.local.json")))) {
    const oldProjectSettings = await loadProjectSettings(context.projectPath);
    await environmentManager.createLocalEnv(context.projectPath, oldProjectSettings.appName!);
  }
}

export async function ensureTrackingIdInGlobal(context: CoreHookContext): Promise<void> {
  const projectPath = getParameterFromCxt(context, "projectPath", "");
  const projectId = await getTrackingIdFromPath(projectPath);
  globalVars.trackingId = projectId; // set trackingId to globalVars
}

export async function configsMigration(context: MigrationContext): Promise<void> {
  // general
  if (await context.fsPathExists(path.join(".fx", "configs"))) {
    // if ./fx/states/ exists
    const fileNames = fsReadDirSync(context, path.join(".fx", "configs")); // search all files, get file names
    for (const fileName of fileNames)
      if (fileName.startsWith("config.")) {
        const fileRegex = new RegExp("(config\\.)([a-zA-Z0-9_-]*)(\\.json)", "g"); // state.*.json
        const fileNamesArray = fileRegex.exec(fileName);
        if (fileNamesArray != null) {
          // get envName
          const envName = fileNamesArray[2];
          // create .env.{env} file if not exist
          await context.fsEnsureDir(MetadataV3.defaultEnvironmentFolder);
          if (
            !(await context.fsPathExists(
              path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName)
            ))
          )
            await context.fsCreateFile(
              path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName)
            );
          const obj = await readJsonFile(
            context,
            path.join(".fx", "configs", "config." + envName + ".json")
          );
          if (obj["manifest"]) {
            const bicepContent = await readBicepContent(context);
            const teamsfx_env = fs
              .readFileSync(
                path.join(
                  context.projectPath,
                  MetadataV3.defaultEnvironmentFolder,
                  Constants.envFilePrefix + envName
                )
              )
              .toString()
              .includes("TEAMSFX_ENV=")
              ? ""
              : "TEAMSFX_ENV=" + envName + EOL;
            // convert every name and add the env name at the first line
            const envData =
              teamsfx_env +
              jsonObjectNamesConvertV3(
                obj["manifest"],
                "manifest.",
                "",
                FileType.CONFIG,
                bicepContent
              );
            await context.fsWriteFile(
              path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName),
              envData,
              Constants.envWriteOption
            );
          }
        }
      }
  }
}

export async function statesMigration(context: MigrationContext): Promise<void> {
  // general
  if (await context.fsPathExists(path.join(".fx", "states"))) {
    // if ./fx/states/ exists
    const fileNames = fsReadDirSync(context, path.join(".fx", "states")); // search all files, get file names
    for (const fileName of fileNames)
      if (fileName.startsWith("state.")) {
        const fileRegex = new RegExp("(state\\.)([a-zA-Z0-9_-]*)(\\.json)", "g"); // state.*.json
        const fileNamesArray = fileRegex.exec(fileName);
        if (fileNamesArray != null) {
          // get envName
          const envName = fileNamesArray[2];
          // create .env.{env} file if not exist
          await context.fsEnsureDir(MetadataV3.defaultEnvironmentFolder);
          if (
            !(await context.fsPathExists(
              path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName)
            ))
          )
            await context.fsCreateFile(
              path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName)
            );
          const obj = await readJsonFile(
            context,
            path.join(".fx", "states", "state." + envName + ".json")
          );
          if (obj) {
            const bicepContent = await readBicepContent(context);
            // convert every name
            const envData = jsonObjectNamesConvertV3(
              obj,
              "state.",
              "",
              FileType.STATE,
              bicepContent
            );
            await context.fsWriteFile(
              path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName),
              envData,
              Constants.envWriteOption
            );
          }
        }
      }
  }
}

export async function userdataMigration(context: MigrationContext): Promise<void> {
  const stateFolder = path.join(MetadataV2.configFolder, MetadataV2.stateFolder);
  if (!(await context.fsPathExists(stateFolder))) {
    return;
  }
  await context.fsEnsureDir(MetadataV3.defaultEnvironmentFolder);
  const stateFiles = fsReadDirSync(context, stateFolder); // search all files, get file names
  for (const stateFile of stateFiles) {
    const envName = tryExtractEnvFromUserdata(stateFile);
    if (envName) {
      // get envName
      const envFileName = buildEnvUserFileName(envName);
      const bicepContent = await readBicepContent(context);
      const envData = await readAndConvertUserdata(
        context,
        path.join(stateFolder, stateFile),
        bicepContent
      );
      await context.fsWriteFile(
        path.join(MetadataV3.defaultEnvironmentFolder, envFileName),
        envData,
        Constants.envWriteOption
      );
    }
  }
}

export async function debugMigration(context: MigrationContext): Promise<void> {
  // Backup vscode/tasks.json
  await context.backup(Constants.tasksJsonPath);

  // Read .vscode/tasks.json
  const tasksJsonContent = await readJsonCommentFile(
    path.join(context.projectPath, Constants.tasksJsonPath)
  );
  if (!isCommentObject(tasksJsonContent) || !Array.isArray(tasksJsonContent["tasks"])) {
    // Invalid tasks.json content
    return;
  }

  // Migrate .vscode/tasks.json
  const migrateTaskFuncs = [
    migrateTransparentPrerequisite,
    migrateTransparentNpmInstall,
    migrateTransparentLocalTunnel,
    migrateSetUpTab,
    migrateSetUpBot,
    migrateSetUpSSO,
    migratePrepareManifest,
    migrateInstallAppInTeams,
    migrateValidateDependencies,
    migrateBackendExtensionsInstall,
    migrateFrontendStart,
    migrateAuthStart,
    migrateBotStart,
    migrateBackendWatch,
    migrateBackendStart,
    migratePreDebugCheck,
    migrateValidateLocalPrerequisites,
    migrateNgrokStartTask,
    migrateNgrokStartCommand,
  ];

  const oldProjectSettings = await loadProjectSettings(context.projectPath);
  const placeholderMappings = await getPlaceholderMappings(context);

  const debugContext = new DebugMigrationContext(
    context,
    tasksJsonContent["tasks"],
    oldProjectSettings,
    placeholderMappings
  );

  for (const func of migrateTaskFuncs) {
    await func(debugContext);
  }

  // Write .vscode/tasks.json
  await context.fsWriteFile(
    Constants.tasksJsonPath,
    commentJson.stringify(tasksJsonContent, null, 4)
  );

  // Generate app.local.yml
  const appYmlGenerator = new AppLocalYmlGenerator(
    oldProjectSettings,
    debugContext.appYmlConfig,
    placeholderMappings
  );
  const appYmlString: string = await appYmlGenerator.generateAppYml();
  await context.fsWriteFile(MetadataV3.localConfigFile, appYmlString);
}

export function checkapimPluginExists(pjSettings: any): boolean {
  if (pjSettings && pjSettings["components"]) {
    for (const obj of pjSettings["components"])
      if (Object.keys(obj).includes("name") && obj["name"] === "apim") return true;
    return false;
  } else {
    return false;
  }
}

export async function generateApimPluginEnvContent(context: MigrationContext): Promise<void> {
  // general
  if (await context.fsPathExists(path.join(".fx", "configs", "projectSettings.json"))) {
    const projectSettingsContent = fs.readJsonSync(
      path.join(context.projectPath, ".fx", "configs", "projectSettings.json")
    );
    // judge if apim plugin exists
    if (checkapimPluginExists(projectSettingsContent)) {
      const fileNames = fsReadDirSync(context, path.join(".fx", "configs"));
      for (const fileName of fileNames)
        if (fileName.startsWith("config.")) {
          const fileRegex = new RegExp("(config.)([a-zA-Z0-9_-]*)(.json)", "g"); // state.*.json
          const fileNamesArray = fileRegex.exec(fileName);
          if (fileNamesArray != null) {
            // get envName
            const envName = fileNamesArray[2];
            if (envName != "local") {
              await context.fsEnsureDir(MetadataV3.defaultEnvironmentFolder);
              if (
                !(await context.fsPathExists(
                  path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName)
                ))
              )
                await context.fsCreateFile(
                  path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName)
                );
              const apimPluginAppendContent =
                "APIM__PUBLISHEREMAIL= # Teams Toolkit does not record your mail to protect your privacy, please fill your mail address here before provision to avoid failures" +
                EOL +
                "APIM__PUBLISHERNAME= # Teams Toolkit does not record your name to protect your privacy, please fill your name here before provision to avoid failures" +
                EOL;
              await context.fsWriteFile(
                path.join(MetadataV3.defaultEnvironmentFolder, Constants.envFilePrefix + envName),
                apimPluginAppendContent,
                Constants.envWriteOption
              );
            }
          }
        }
    }
  }
}

export async function updateGitignore(context: MigrationContext): Promise<void> {
  const gitignoreFile = ".gitignore";
  const ignoreFileExist: boolean = await context.backup(gitignoreFile);
  if (!ignoreFileExist) {
    context.fsCreateFile(gitignoreFile);
  }

  let ignoreFileContent: string = await fs.readFile(
    path.join(context.projectPath, gitignoreFile),
    "utf8"
  );
  ignoreFileContent += EOL + `${MetadataV3.defaultEnvironmentFolder}/${buildEnvUserFileName("*")}`;
  ignoreFileContent += EOL + `${MetadataV3.defaultEnvironmentFolder}/${buildEnvFileName("local")}`;
  ignoreFileContent += EOL + `${backupFolder}/*`;

  await context.fsWriteFile(gitignoreFile, ignoreFileContent);
}
