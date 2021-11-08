// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  AzureSolutionSettings,
  ConfigFolderName,
  EnvConfig,
  err,
  InputConfigsFolderName,
  Inputs,
  Platform,
  ProjectSettings,
  ProjectSettingsFileName,
  StatesFolderName,
  returnSystemError,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import {
  CoreHookContext,
  serializeDict,
  SolutionConfigError,
  ProjectSettingError,
  environmentManager,
  SPFxConfigError,
  getResourceFolder,
} from "../..";
import { UpgradeCanceledError } from "../error";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import { readJson } from "../../common/fileUtils";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { CoreSource, FxCore } from "..";
import {
  isMultiEnvEnabled,
  isArmSupportEnabled,
  getStrings,
  isSPFxProject,
} from "../../common/tools";
import { loadProjectSettings } from "./projectSettingsLoader";
import { generateArmTemplate } from "../../plugins/solution/fx-solution/arm";
import {
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
} from "../../plugins/solution/fx-solution/question";
import { createLocalManifest, createManifest } from "../../plugins/resource/appstudio/plugin";
import { loadSolutionContext } from "./envInfoLoader";
import { ResourcePlugins } from "../../common/constants";
import { getActivatedResourcePlugins } from "../../plugins/solution/fx-solution/ResourcePluginContainer";
import { LocalDebugConfigKeys } from "../../plugins/resource/localdebug/constants";
import {
  MANIFEST_LOCAL,
  MANIFEST_TEMPLATE,
  REMOTE_MANIFEST,
} from "../../plugins/resource/appstudio/constants";
import {
  Component,
  ProjectMigratorGuideStatus,
  ProjectMigratorStatus,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import * as dotenv from "dotenv";
import { PlaceHolders } from "../../plugins/resource/spfx/utils/constants";
import { Utils as SPFxUtils } from "../../plugins/resource/spfx/utils/utils";
import { EOL } from "os";
import { Manifest } from "../../plugins/resource/frontend/ops/scaffold";

const programmingLanguage = "programmingLanguage";
const defaultFunctionName = "defaultFunctionName";
const learnMoreText = "Learn More";
const reloadText = "Reload";
const upgradeButton = "Upgrade";
const solutionName = "solution";
const subscriptionId = "subscriptionId";
const resourceGroupName = "resourceGroupName";
const parameterFileNameTemplate = "azure.parameters.@envName.json";
const learnMoreLink = "https://aka.ms/teamsfx-migration-guide";
const manualUpgradeLink = `${learnMoreLink}#upgrade-your-project-manually`;
const upgradeReportName = `upgrade-change-logs.md`;
let updateNotificationFlag = false;
let fromReloadFlag = false;

class EnvConfigName {
  static readonly StorageName = "storageName";
  static readonly Identity = "identity";
  static readonly IdentityId = "identityId";
  static readonly IdentityName = "identityName";
  static readonly IdentityResourceId = "identityResourceId";
  static readonly IdentityClientId = "identityClientId";
  static readonly SqlEndpoint = "sqlEndpoint";
  static readonly SqlResourceId = "sqlResourceId";
  static readonly SqlDataBase = "databaseName";
  static readonly SkuName = "skuName";
  static readonly AppServicePlanName = "appServicePlanName";
  static readonly StorageAccountName = "storageAccountName";
  static readonly StorageResourceId = "storageResourceId";
  static readonly FuncAppName = "functionAppName";
  static readonly FunctionId = "functionAppId";
  static readonly Endpoint = "endpoint";
}

class ArmParameters {
  static readonly FEStorageName = "frontendHosting_storageName";
  static readonly IdentityName = "identity_managedIdentityName";
  static readonly SQLServer = "azureSql_serverName";
  static readonly SQLDatabase = "azureSql_databaseName";
  static readonly SimpleAuthSku = "simpleAuth_sku";
  static readonly functionServerName = "function_serverfarmsName";
  static readonly functionStorageName = "function_storageName";
  static readonly functionAppName = "function_webappName";
  static readonly botWebAppSku = "bot_webAppSKU";
  static readonly SimpleAuthWebAppName = "simpleAuth_webAppName";
  static readonly SimpleAuthServerFarm = "simpleAuth_serverFarmsName";
}

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if ((await needMigrateToArmAndMultiEnv(ctx)) && checkMethod(ctx)) {
    const core = ctx.self as FxCore;

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart);
    const res = await core.tools.ui.showMessage(
      "warn",
      getStrings().solution.MigrationToArmAndMultiEnvMessage,
      true,
      upgradeButton
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != upgradeButton) {
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
        [TelemetryProperty.Status]: ProjectMigratorStatus.Cancel,
      });
      ctx.result = err(UpgradeCanceledError());
      core.tools.logProvider.warning(`[core] Upgrade cancelled.`);
      core.tools.logProvider.warning(
        `[core] Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit. If you want to upgrade, please run command (Teams: Check project upgrade) or click the “Upgrade project” button on tree view to trigger the upgrade.`
      );

      core.tools.logProvider.warning(
        `[core]If you are not ready to upgrade and want to continue to use the old version Teams Toolkit, please find Teams Toolkit in Extension and install the version <= 2.7.0`
      );
      return;
    }
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryProperty.Status]: ProjectMigratorStatus.OK,
    });

    await migrateToArmAndMultiEnv(ctx);
    core.tools.logProvider.warning(
      `[core] Upgrade success! All old files in .fx and appPackage folder have been backed up to the .backup folder and you can delete it. Read this wiki(${learnMoreLink}) if you want to restore your configuration files or learn more about this upgrade.`
    );
    core.tools.logProvider.warning(
      `[core] Read upgrade-change-logs.md to learn about details for this upgrade.`
    );
  } else if ((await needUpdateTeamsToolkitVersion(ctx)) && !updateNotificationFlag) {
    // TODO: delete before Arm && Multi-env version released
    // only for arm && multi-env project with unreleased teams toolkit version
    updateNotificationFlag = true;
    const core = ctx.self as FxCore;
    core.tools.ui.showMessage(
      "info",
      getStrings().solution.NeedToUpdateTeamsToolkitVersionMessage,
      false,
      "OK"
    );
  }
  await next();
};

function checkMethod(ctx: CoreHookContext): boolean {
  const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);
  if (ctx.method && methods.has(ctx.method) && fromReloadFlag) return false;
  fromReloadFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}

async function getOldProjectInfoForTelemetry(
  projectPath: string
): Promise<{ [key: string]: string }> {
  try {
    const inputs: Inputs = {
      projectPath: projectPath,
      // not used by `loadProjectSettings` but the type `Inputs` requires it.
      platform: Platform.VSCode,
    };
    const loadRes = await loadProjectSettings(inputs, false);
    if (loadRes.isErr()) {
      return {};
    }
    const projectSettings = loadRes.value;
    const solutionSettings = projectSettings.solutionSettings;
    const hostType = solutionSettings.hostType;
    const result: { [key: string]: string } = { [TelemetryProperty.HostType]: hostType };

    if (hostType === HostTypeOptionAzure || hostType === HostTypeOptionSPFx) {
      result[TelemetryProperty.ActivePlugins] = JSON.stringify(
        solutionSettings.activeResourcePlugins
      );
      result[TelemetryProperty.Capabilities] = JSON.stringify(solutionSettings.capabilities);
    }
    if (hostType === HostTypeOptionAzure) {
      const azureSolutionSettings = solutionSettings as AzureSolutionSettings;
      result[TelemetryProperty.AzureResources] = JSON.stringify(
        azureSolutionSettings.azureResources
      );
    }
    return result;
  } catch (error) {
    // ignore telemetry errors
    return {};
  }
}

async function migrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<void> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const projectPath = inputs.projectPath as string;
  const telemetryProperties = await getOldProjectInfoForTelemetry(projectPath);
  sendTelemetryEvent(
    Component.core,
    TelemetryEvent.ProjectMigratorMigrateStart,
    telemetryProperties
  );

  await backup(projectPath);
  try {
    await updateConfig(ctx);

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateMultiEnvStart);
    await migrateMultiEnv(projectPath);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateMultiEnv);

    const loadRes = await loadProjectSettings(inputs);
    if (loadRes.isErr()) {
      throw ProjectSettingError();
    }
    const projectSettings = loadRes.value;
    if (!isSPFxProject(projectSettings) && !projectSettings?.solutionSettings?.migrateFromV1) {
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateArmStart);
      await migrateArm(ctx);
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateArm);
    }
  } catch (err) {
    await handleError(projectPath, ctx);
    throw err;
  }
  await postMigration(projectPath, ctx, inputs);
}

async function handleError(projectPath: string, ctx: CoreHookContext) {
  await cleanup(projectPath);
  const core = ctx.self as FxCore;
  core.tools.ui
    .showMessage(
      "info",
      getStrings().solution.MigrationToArmAndMultiEnvErrorMessage,
      false,
      learnMoreText
    )
    .then((result) => {
      const userSelected = result.isOk() ? result.value : undefined;
      if (userSelected === learnMoreText) {
        core.tools.ui!.openUrl(manualUpgradeLink);
      }
    });
}

async function generateUpgradeReport(ctx: CoreHookContext) {
  try {
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    const projectPath = inputs.projectPath as string;
    const target = path.join(projectPath, upgradeReportName);
    const source = path.resolve(path.join(getResourceFolder(), upgradeReportName));
    await fs.copyFile(source, target);
  } catch (error) {
    // do nothing
  }
}

async function postMigration(
  projectPath: string,
  ctx: CoreHookContext,
  inputs: Inputs
): Promise<void> {
  await removeOldProjectFiles(projectPath);
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrate);
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorGuideStart);
  await generateUpgradeReport(ctx);
  const core = ctx.self as FxCore;
  core.tools.ui
    .showMessage(
      "info",
      getStrings().solution.MigrationToArmAndMultiEnvSuccessMessage,
      false,
      reloadText
    )
    .then((result) => {
      const userSelected = result.isOk() ? result.value : undefined;
      if (userSelected === reloadText) {
        sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorGuide, {
          [TelemetryProperty.Status]: ProjectMigratorGuideStatus.Reload,
        });
        if (inputs.platform === Platform.VSCode) {
          core.tools.ui.reload?.();
        }
      } else {
        sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorGuide, {
          [TelemetryProperty.Status]: ProjectMigratorGuideStatus.Cancel,
        });
      }
    });
}

async function generateRemoteTemplate(manifestString: string) {
  manifestString = manifestString.replace(new RegExp("{version}", "g"), "1.0.0");
  manifestString = manifestString.replace(
    new RegExp("{baseUrl}", "g"),
    "{{{state.fx-resource-frontend-hosting.endpoint}}}"
  );
  manifestString = manifestString.replace(
    new RegExp("{appClientId}", "g"),
    "{{state.fx-resource-aad-app-for-teams.clientId}}"
  );
  manifestString = manifestString.replace(
    new RegExp("{webApplicationInfoResource}", "g"),
    "{{{state.fx-resource-aad-app-for-teams.applicationIdUris}}}"
  );
  manifestString = manifestString.replace(
    new RegExp("{botId}", "g"),
    "{{state.fx-resource-bot.botId}}"
  );
  const manifest: TeamsAppManifest = JSON.parse(manifestString);
  manifest.name.short = "{{config.manifest.appName.short}}";
  manifest.name.full = "{{config.manifest.appName.full}}";
  manifest.id = "{{state.fx-resource-appstudio.teamsAppId}}";
  return manifest;
}

async function generateLocalTemplate(manifestString: string) {
  manifestString = manifestString.replace(new RegExp("{version}", "g"), "1.0.0");
  manifestString = manifestString.replace(
    new RegExp("{baseUrl}", "g"),
    "{{{localSettings.frontend.tabEndpoint}}}"
  );
  manifestString = manifestString.replace(
    new RegExp("{appClientId}", "g"),
    "{{localSettings.auth.clientId}}"
  );
  manifestString = manifestString.replace(
    new RegExp("{webApplicationInfoResource}", "g"),
    "{{{localSettings.auth.applicationIdUris}}}"
  );
  manifestString = manifestString.replace(
    new RegExp("{botId}", "g"),
    "{{localSettings.bot.botId}}"
  );
  const manifest: TeamsAppManifest = JSON.parse(manifestString);
  manifest.name.full =
    (manifest.name.full ? manifest.name.full : manifest.name.short) + "-local-debug";
  manifest.name.short = manifest.name.short.substr(0, 18) + "-local-debug";
  manifest.id = "{{localSettings.teamsApp.teamsAppId}}";
  return manifest;
}

async function getManifest(
  sourceManifestFile: string,
  appName: string,
  hasFrontend: boolean,
  hasBotCapability: boolean,
  hasMessageExtensionCapability: boolean,
  isSPFx: boolean,
  migrateFromV1: boolean
): Promise<TeamsAppManifest> {
  let manifest: TeamsAppManifest | undefined;
  let error = undefined;
  try {
    manifest = await readJson(sourceManifestFile);
  } catch (err) {
    error = err;
    manifest = await createManifest(
      appName,
      hasFrontend,
      hasBotCapability,
      hasMessageExtensionCapability,
      isSPFx,
      migrateFromV1
    );
  }
  if (!manifest) {
    throw error;
  }
  return manifest;
}

async function migrateMultiEnv(projectPath: string): Promise<void> {
  const { fx, fxConfig, templateAppPackage, fxState } = await getMultiEnvFolders(projectPath);
  const {
    hasFrontend,
    hasBackend,
    hasBot,
    hasBotCapability,
    hasMessageExtensionCapability,
    isSPFx,
    hasProvision,
    migrateFromV1,
  } = await queryProjectStatus(fx);

  //localSettings.json
  const localSettingsProvider = new LocalSettingsProvider(projectPath);
  await localSettingsProvider.save(
    localSettingsProvider.init(hasFrontend, hasBackend, hasBot, migrateFromV1)
  );
  //projectSettings.json
  const projectSettings = path.join(fxConfig, ProjectSettingsFileName);
  await fs.copy(path.join(fx, "settings.json"), projectSettings);
  await ensureProjectSettings(projectSettings, path.join(fx, "env.default.json"));

  const appName = await getAppName(projectSettings);
  if (!migrateFromV1) {
    //config.dev.json
    await fs.writeFile(
      path.join(fxConfig, "config.dev.json"),
      JSON.stringify(getConfigDevJson(appName), null, 4)
    );
  }

  // appPackage
  if (await fs.pathExists(path.join(projectPath, AppPackageFolderName))) {
    await fs.copy(path.join(projectPath, AppPackageFolderName), templateAppPackage);
  } else if (await fs.pathExists(path.join(fx, AppPackageFolderName))) {
    // version <= 2.4.1
    await fs.copy(path.join(fx, AppPackageFolderName), templateAppPackage);
  }
  const sourceManifestFile = path.join(templateAppPackage, REMOTE_MANIFEST);
  const manifest: TeamsAppManifest = await getManifest(
    sourceManifestFile,
    appName,
    hasFrontend,
    hasBotCapability,
    hasMessageExtensionCapability,
    isSPFx,
    migrateFromV1
  );
  await fs.remove(sourceManifestFile);
  await moveIconsToResourceFolder(templateAppPackage, manifest);
  // generate manifest.remote.template.json
  if (!migrateFromV1) {
    const targetRemoteManifestFile = path.join(templateAppPackage, MANIFEST_TEMPLATE);
    const remoteManifest = await generateRemoteTemplate(JSON.stringify(manifest));
    await fs.writeFile(targetRemoteManifestFile, JSON.stringify(remoteManifest, null, 4));
  }

  // generate manifest.local.template.json
  // TODO: use generateLocalTemplate instead of create
  const localManifest: TeamsAppManifest = migrateFromV1
    ? await generateLocalTemplate(JSON.stringify(manifest))
    : await createLocalManifest(
        appName,
        hasFrontend,
        hasBotCapability,
        hasMessageExtensionCapability,
        isSPFx,
        false
      );
  const targetLocalManifestFile = path.join(templateAppPackage, MANIFEST_LOCAL);
  await fs.writeFile(targetLocalManifestFile, JSON.stringify(localManifest, null, 4));

  if (isSPFx) {
    const replaceMap: Map<string, string> = new Map();
    const packageSolutionFile = `${projectPath}/SPFx/config/package-solution.json`;
    if (!(await fs.pathExists(packageSolutionFile))) {
      throw SPFxConfigError(packageSolutionFile);
    }
    const solutionConfig = await fs.readJson(packageSolutionFile);
    replaceMap.set(PlaceHolders.componentId, solutionConfig.solution.id);
    replaceMap.set(PlaceHolders.componentNameUnescaped, localManifest.packageName!);
    await SPFxUtils.configure(targetLocalManifestFile, replaceMap);
  }

  if (hasProvision) {
    const devState = path.join(fxState, "state.dev.json");
    const devUserData = path.join(fxState, "dev.userdata");
    await fs.copy(path.join(fx, "new.env.default.json"), devState);
    if (await fs.pathExists(path.join(fx, "default.userdata"))) {
      await fs.copy(path.join(fx, "default.userdata"), devUserData);
    }
    await removeExpiredFields(devState, devUserData);
  }
}

async function moveIconsToResourceFolder(
  templateAppPackage: string,
  manifest: TeamsAppManifest
): Promise<void> {
  // see AppStudioPluginImpl.buildTeamsAppPackage()
  const hasColorIcon = manifest.icons.color && !manifest.icons.color.startsWith("https://");
  const hasOutlineIcon = manifest.icons.outline && !manifest.icons.outline.startsWith("https://");
  if (!hasColorIcon || !hasOutlineIcon) {
    return;
  }

  // move to resources
  const resource = path.join(templateAppPackage, "resources");
  const colorName = manifest.icons.color.replace("resources/", "");
  const outlineName = manifest.icons.outline.replace("resources/", "");
  const iconColor = path.join(templateAppPackage, colorName);
  const iconOutline = path.join(templateAppPackage, outlineName);
  await fs.ensureDir(resource);
  if (await fs.pathExists(iconColor)) {
    await fs.move(iconColor, path.join(resource, colorName));
    manifest.icons.color = `resources/${colorName}`;
  }
  if (await fs.pathExists(iconOutline)) {
    await fs.move(iconOutline, path.join(resource, outlineName));
    manifest.icons.outline = `resources/${outlineName}`;
  }

  return;
}

async function removeExpiredFields(devState: string, devUserData: string): Promise<void> {
  const stateData = await readJson(devState);
  const secrets: Record<string, string> = dotenv.parse(await fs.readFile(devUserData, "UTF-8"));

  stateData[PluginNames.APPST]["teamsAppId"] = stateData[PluginNames.SOLUTION]["remoteTeamsAppId"];

  const expiredStateKeys: [string, string][] = [
    [PluginNames.LDEBUG, ""],
    [PluginNames.SOLUTION, programmingLanguage],
    [PluginNames.SOLUTION, defaultFunctionName],
    [PluginNames.SOLUTION, "localDebugTeamsAppId"],
    [PluginNames.SOLUTION, "remoteTeamsAppId"],
    [PluginNames.AAD, "local_clientId"],
    [PluginNames.AAD, "local_objectId"],
    [PluginNames.AAD, "local_tenantId"],
    [PluginNames.AAD, "local_clientSecret"],
    [PluginNames.AAD, "local_oauth2PermissionScopeId"],
    [PluginNames.AAD, "local_applicationIdUris"],
    [PluginNames.SA, "filePath"],
    [PluginNames.SA, "environmentVariableParams"],
  ];
  for (const [k, v] of expiredStateKeys) {
    if (stateData[k]) {
      if (!v) {
        delete stateData[k];
      } else if (stateData[k][v]) {
        delete stateData[k][v];
      }
    }
  }

  for (const [_, value] of Object.entries(LocalDebugConfigKeys)) {
    deleteUserDataKey(secrets, `${PluginNames.LDEBUG}.${value}`);
  }
  deleteUserDataKey(secrets, `${PluginNames.AAD}.local_clientSecret`);

  await fs.writeFile(devState, JSON.stringify(stateData, null, 4), { encoding: "UTF-8" });
  await fs.writeFile(devUserData, serializeDict(secrets), { encoding: "UTF-8" });
}

function deleteUserDataKey(secrets: Record<string, string>, key: string) {
  if (secrets[key]) {
    delete secrets[key];
  }
}

function getConfigDevJson(appName: string): EnvConfig {
  return environmentManager.newEnvConfigData(appName);
}

async function queryProjectStatus(fx: string): Promise<any> {
  const settings: ProjectSettings = await readJson(path.join(fx, "settings.json"));
  const solutionSettings: AzureSolutionSettings =
    settings.solutionSettings as AzureSolutionSettings;
  const plugins = getActivatedResourcePlugins(solutionSettings);
  const envDefaultJson: { solution: { provisionSucceeded: boolean } } = await readJson(
    path.join(fx, "env.default.json")
  );
  const hasFrontend = plugins?.some((plugin) => plugin.name === PluginNames.FE);
  const hasBackend = plugins?.some((plugin) => plugin.name === PluginNames.FUNC);
  const hasBot = plugins?.some((plugin) => plugin.name === PluginNames.BOT);
  const hasBotCapability = solutionSettings.capabilities.includes(BotOptionItem.id);
  const hasMessageExtensionCapability = solutionSettings.capabilities.includes(
    MessageExtensionItem.id
  );
  const isSPFx = plugins?.some((plugin) => plugin.name === PluginNames.SPFX);
  const hasProvision = envDefaultJson.solution?.provisionSucceeded as boolean;
  const migrateFromV1 = !!solutionSettings.migrateFromV1;
  return {
    hasFrontend,
    hasBackend,
    hasBot,
    hasBotCapability,
    hasMessageExtensionCapability,
    isSPFx,
    hasProvision,
    migrateFromV1,
  };
}

async function getMultiEnvFolders(projectPath: string): Promise<any> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAppPackage = path.join(projectPath, "templates", AppPackageFolderName);
  const fxState = path.join(fx, StatesFolderName);
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAppPackage);
  return { fx, fxConfig, templateAppPackage, fxState };
}

async function getBackupFolder(projectPath: string): Promise<string> {
  const backupName = ".backup";
  const backup = path.join(projectPath, backupName);
  if (!(await fs.pathExists(backup))) {
    return backup;
  }
  // avoid conflict(rarely)
  return path.join(projectPath, `.teamsfx${backupName}`);
}
async function backup(projectPath: string): Promise<void> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  const backup = await getBackupFolder(projectPath);
  const backupFx = path.join(backup, `.${ConfigFolderName}`);
  const backupAppPackage = path.join(backup, AppPackageFolderName);
  await fs.ensureDir(backupFx);
  await fs.ensureDir(backupAppPackage);
  const fxFiles = [
    "env.default.json",
    "default.userdata",
    "settings.json",
    "local.env",
    "subscriptionInfo.json",
  ];

  for (const file of fxFiles) {
    if (await fs.pathExists(path.join(fx, file))) {
      await fs.copy(path.join(fx, file), path.join(backupFx, file));
    }
  }
  if (await fs.pathExists(path.join(projectPath, AppPackageFolderName))) {
    await fs.copy(path.join(projectPath, AppPackageFolderName), backupAppPackage);
  } else if (await fs.pathExists(path.join(fx, AppPackageFolderName))) {
    // version <= 2.4.1
    await fs.copy(path.join(fx, AppPackageFolderName), backupAppPackage);
  }
}

async function removeOldProjectFiles(projectPath: string): Promise<void> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  await fs.remove(path.join(fx, "env.default.json"));
  await fs.remove(path.join(fx, "default.userdata"));
  await fs.remove(path.join(fx, "settings.json"));
  await fs.remove(path.join(fx, "local.env"));
  await fs.remove(path.join(projectPath, AppPackageFolderName));
  await fs.remove(path.join(fx, "new.env.default.json"));
  // version <= 2.4.1, remove .fx/appPackage.
  await fs.remove(path.join(fx, AppPackageFolderName));
}

async function ensureProjectSettings(
  projectSettingPath: string,
  envDefaultPath: string
): Promise<void> {
  const settings: ProjectSettings = await readJson(projectSettingPath);
  if (!settings.programmingLanguage || !settings.defaultFunctionName) {
    const envDefault = await readJson(envDefaultPath);
    settings.programmingLanguage =
      settings.programmingLanguage || envDefault[PluginNames.SOLUTION]?.[programmingLanguage];
    settings.defaultFunctionName =
      settings.defaultFunctionName || envDefault[PluginNames.FUNC]?.[defaultFunctionName];
  }
  if (!settings.version) {
    settings.version = "1.0.0";
  }
  await fs.writeFile(projectSettingPath, JSON.stringify(settings, null, 4), {
    encoding: "UTF-8",
  });
}

async function getAppName(projectSettingPath: string): Promise<string> {
  const settings: ProjectSettings = await readJson(projectSettingPath);
  return settings.appName;
}

async function cleanup(projectPath: string): Promise<void> {
  const { _, fxConfig, templateAppPackage, fxState } = await getMultiEnvFolders(projectPath);
  await fs.remove(fxConfig);
  await fs.remove(templateAppPackage);
  await fs.remove(fxState);
  await fs.remove(path.join(templateAppPackage, ".."));
  if (await fs.pathExists(path.join(fxConfig, "..", "new.env.default.json"))) {
    await fs.remove(path.join(fxConfig, "..", "new.env.default.json"));
  }
}

async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
  if (!preCheckEnvEnabled()) {
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
  const parameterEnvFileName = parameterFileNameTemplate.replace(
    "@envName",
    environmentManager.getDefaultEnvName()
  );
  const envFileExist = await fs.pathExists(
    path.join(inputs.projectPath as string, ".fx", "env.default.json")
  );
  const configDirExist = await fs.pathExists(
    path.join(inputs.projectPath as string, ".fx", "configs")
  );
  const armParameterExist = await fs.pathExists(
    path.join(inputs.projectPath as string, ".fx", "configs", parameterEnvFileName)
  );
  if (envFileExist && (!armParameterExist || !configDirExist)) {
    return true;
  }
  return false;
}

async function needUpdateTeamsToolkitVersion(ctx: CoreHookContext): Promise<boolean> {
  if (preCheckEnvEnabled()) {
    return false;
  }
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    return false;
  }
  const fx = path.join(inputs.projectPath as string, ".fx");
  if (!(await fs.pathExists(fx))) {
    return false;
  }
  // only for arm && multi-env project
  const armParameter = path.join(
    fx,
    "configs",
    parameterFileNameTemplate.replace("@envName", "dev")
  );
  const defaultEnv = path.join(fx, "env.default.json");
  return (await fs.pathExists(armParameter)) && !(await fs.pathExists(defaultEnv));
}

function preCheckEnvEnabled() {
  if (isMultiEnvEnabled() && isArmSupportEnabled()) {
    return true;
  }
  return false;
}

export async function migrateArm(ctx: CoreHookContext) {
  await generateArmTempaltesFiles(ctx);
  await generateArmParameterJson(ctx);
}

async function updateConfig(ctx: CoreHookContext) {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const fx = path.join(inputs.projectPath as string, `.${ConfigFolderName}`);
  const envConfig = await fs.readJson(path.join(fx, "env.default.json"));
  if (envConfig[ResourcePlugins.Bot]) {
    delete envConfig[ResourcePlugins.Bot];
    envConfig[ResourcePlugins.Bot] = { wayToRegisterBot: "create-new" };
  }
  let needUpdate = false;
  let configPrefix = "";
  if (envConfig[solutionName][subscriptionId] && envConfig[solutionName][resourceGroupName]) {
    configPrefix = `/subscriptions/${envConfig[solutionName][subscriptionId]}/resourcegroups/${envConfig["solution"][resourceGroupName]}`;
    needUpdate = true;
  }
  if (needUpdate && envConfig[ResourcePlugins.FrontendHosting]?.[EnvConfigName.StorageName]) {
    envConfig[ResourcePlugins.FrontendHosting][
      EnvConfigName.StorageResourceId
    ] = `${configPrefix}/providers/Microsoft.Storage/storageAccounts/${
      envConfig[ResourcePlugins.FrontendHosting][EnvConfigName.StorageName]
    }`;
  }
  if (needUpdate && envConfig[ResourcePlugins.AzureSQL]?.[EnvConfigName.SqlEndpoint]) {
    envConfig[ResourcePlugins.AzureSQL][
      EnvConfigName.SqlResourceId
    ] = `${configPrefix}/providers/Microsoft.Sql/servers/${
      envConfig[ResourcePlugins.AzureSQL][EnvConfigName.SqlEndpoint].split(
        ".database.windows.net"
      )[0]
    }`;
  }
  if (needUpdate && envConfig[ResourcePlugins.Function]?.[EnvConfigName.FuncAppName]) {
    envConfig[ResourcePlugins.Function][
      EnvConfigName.FunctionId
    ] = `${configPrefix}/providers/Microsoft.Web/${
      envConfig[ResourcePlugins.Function][EnvConfigName.FuncAppName]
    }`;
    delete envConfig[ResourcePlugins.Function][EnvConfigName.FuncAppName];
    if (envConfig[ResourcePlugins.Function][EnvConfigName.StorageAccountName]) {
      delete envConfig[ResourcePlugins.Function][EnvConfigName.StorageAccountName];
    }
    if (envConfig[ResourcePlugins.Function][EnvConfigName.AppServicePlanName]) {
      delete envConfig[ResourcePlugins.Function][EnvConfigName.AppServicePlanName];
    }
  }

  if (needUpdate && envConfig[ResourcePlugins.Identity]?.[EnvConfigName.Identity]) {
    envConfig[ResourcePlugins.Identity][
      EnvConfigName.IdentityResourceId
    ] = `${configPrefix}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${
      envConfig[ResourcePlugins.Identity][EnvConfigName.Identity]
    }`;
    envConfig[ResourcePlugins.Identity][EnvConfigName.IdentityName] =
      envConfig[ResourcePlugins.Identity][EnvConfigName.Identity];
    delete envConfig[ResourcePlugins.Identity][EnvConfigName.Identity];
  }

  if (needUpdate && envConfig[ResourcePlugins.Identity]?.[EnvConfigName.IdentityId]) {
    envConfig[ResourcePlugins.Identity][EnvConfigName.IdentityClientId] =
      envConfig[ResourcePlugins.Identity][EnvConfigName.IdentityId];
    delete envConfig[ResourcePlugins.Identity][EnvConfigName.IdentityId];
  }
  await fs.writeFile(path.join(fx, "new.env.default.json"), JSON.stringify(envConfig, null, 4));
}

async function generateArmTempaltesFiles(ctx: CoreHookContext) {
  const minorCtx: CoreHookContext = { arguments: ctx.arguments };
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const core = ctx.self as FxCore;

  const fx = path.join(inputs.projectPath as string, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAzure = path.join(inputs.projectPath as string, "templates", "azure");
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAzure);
  // load local settings.json
  const loadRes = await loadProjectSettings(inputs);
  if (loadRes.isErr()) {
    throw ProjectSettingError();
  }
  const projectSettings = loadRes.value;
  minorCtx.projectSettings = projectSettings;

  const targetEnvName = "dev";
  const result = await loadSolutionContext(
    core.tools,
    inputs,
    minorCtx.projectSettings,
    targetEnvName,
    inputs.ignoreEnvInfo
  );
  if (result.isErr()) {
    throw SolutionConfigError();
  }
  minorCtx.solutionContext = result.value;
  // generate bicep files.
  try {
    await generateArmTemplate(minorCtx.solutionContext);
  } catch (error) {
    throw error;
  }
  const parameterEnvFileName = parameterFileNameTemplate.replace(
    "@envName",
    environmentManager.getDefaultEnvName()
  );
  if (!(await fs.pathExists(path.join(fxConfig, parameterEnvFileName)))) {
    throw err(
      returnSystemError(
        new Error(`Failed to generate ${parameterEnvFileName} on migration`),
        CoreSource,
        "GenerateArmTemplateFailed"
      )
    );
  }
}

async function generateArmParameterJson(ctx: CoreHookContext) {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const fx = path.join(inputs.projectPath as string, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const envConfig = await fs.readJson(path.join(fx, "env.default.json"));
  const parameterEnvFileName = parameterFileNameTemplate.replace(
    "@envName",
    environmentManager.getDefaultEnvName()
  );
  const targetJson = await fs.readJson(path.join(fxConfig, parameterEnvFileName));
  const ArmParameter = "parameters";
  // frontend hosting
  if (envConfig[ResourcePlugins.FrontendHosting]?.[EnvConfigName.StorageName]) {
    targetJson[ArmParameter][ArmParameters.FEStorageName] = {
      value: envConfig[ResourcePlugins.FrontendHosting][EnvConfigName.StorageName],
    };
  }
  // manage identity
  if (envConfig[ResourcePlugins.Identity]?.[EnvConfigName.Identity]) {
    targetJson[ArmParameter][ArmParameters.IdentityName] = {
      value: envConfig[ResourcePlugins.Identity][EnvConfigName.Identity],
    };
  }
  // azure SQL
  if (envConfig[ResourcePlugins.AzureSQL]?.[EnvConfigName.SqlEndpoint]) {
    targetJson[ArmParameter][ArmParameters.SQLServer] = {
      value:
        envConfig[ResourcePlugins.AzureSQL][EnvConfigName.SqlEndpoint].split(
          ".database.windows.net"
        )[0],
    };
  }
  if (envConfig[ResourcePlugins.AzureSQL]?.[EnvConfigName.SqlDataBase]) {
    targetJson[ArmParameter][ArmParameters.SQLDatabase] = {
      value: envConfig[ResourcePlugins.AzureSQL][EnvConfigName.SqlDataBase],
    };
  }
  // SimpleAuth
  if (envConfig[ResourcePlugins.SimpleAuth]?.[EnvConfigName.SkuName]) {
    targetJson[ArmParameter][ArmParameters.SimpleAuthSku] = {
      value: envConfig[ResourcePlugins.SimpleAuth][EnvConfigName.SkuName],
    };
  }

  if (envConfig[ResourcePlugins.SimpleAuth]?.[EnvConfigName.Endpoint]) {
    const simpleAuthHost = new URL(envConfig[ResourcePlugins.SimpleAuth]?.[EnvConfigName.Endpoint])
      .hostname;
    const simpleAuthName = simpleAuthHost.split(".")[0];
    targetJson[ArmParameter][ArmParameters.SimpleAuthWebAppName] = targetJson[ArmParameter][
      ArmParameters.SimpleAuthServerFarm
    ] = {
      value: simpleAuthName,
    };
  }
  // Function
  if (envConfig[ResourcePlugins.Function]?.[EnvConfigName.AppServicePlanName]) {
    targetJson[ArmParameter][ArmParameters.functionServerName] = {
      value: envConfig[ResourcePlugins.Function][EnvConfigName.AppServicePlanName],
    };
  }
  if (envConfig[ResourcePlugins.Function]?.[EnvConfigName.StorageAccountName]) {
    targetJson[ArmParameter][ArmParameters.functionStorageName] = {
      value: envConfig[ResourcePlugins.Function][EnvConfigName.StorageAccountName],
    };
  }
  if (envConfig[ResourcePlugins.Function]?.[EnvConfigName.FuncAppName]) {
    targetJson[ArmParameter][ArmParameters.functionAppName] = {
      value: envConfig[ResourcePlugins.Function][EnvConfigName.FuncAppName],
    };
  }

  // Bot
  if (envConfig[ResourcePlugins.Bot]?.[EnvConfigName.SkuName]) {
    targetJson[ArmParameter][ArmParameters.botWebAppSku] = {
      value: envConfig[ResourcePlugins.Bot]?.[EnvConfigName.SkuName],
    };
  }
  await fs.writeFile(
    path.join(fxConfig, parameterEnvFileName),
    JSON.stringify(targetJson, null, 4)
  );
}
