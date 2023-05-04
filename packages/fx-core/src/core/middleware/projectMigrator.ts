// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  assembleError,
  AzureSolutionSettings,
  Bicep,
  BuildFolderName,
  CloudResource,
  ConfigFolderName,
  EnvConfig,
  err,
  FxError,
  InputConfigsFolderName,
  Inputs,
  InputsWithProjectPath,
  LogProvider,
  ok,
  Platform,
  ProjectSettings,
  ProjectSettingsV3,
  Result,
  StatesFolderName,
  SystemError,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { serializeDict, isSPFxProject } from "../../common/tools";
import { environmentManager } from "../environment";
import { getResourceFolder } from "../../folder";
import { globalStateUpdate } from "../../common/globalState";
import {
  UpgradeCanceledError,
  ProjectSettingError,
  SPFxConfigError,
  NotJsonError,
  CoreSource,
} from "../error";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import os from "os";
import "../../component/registerService";

import {
  PluginNames,
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  ComponentNames,
  Scenarios,
} from "../../component/constants";
import {
  getProjectSettingsPath,
  loadProjectSettings,
  loadProjectSettingsByProjectPath,
} from "./projectSettingsLoader";
import { ResourcePlugins } from "../../common/constants";
import {
  MANIFEST_LOCAL,
  MANIFEST_TEMPLATE,
  REMOTE_MANIFEST,
} from "../../component/resource/appManifest/constants";
import { getLocalAppName } from "../../component/resource/appManifest/utils/utils";
import {
  Component,
  ProjectMigratorGuideStatus,
  ProjectMigratorStatus,
  sendTelemetryErrorEvent,
  sendTelemetryEvent,
  TelemetryEvent,
  TelemetryProperty,
} from "../../common/telemetry";
import * as dotenv from "dotenv";
import { PlaceHolders } from "../../component/resource/spfx/utils/constants";
import { Utils as SPFxUtils } from "../../component/resource/spfx/utils/utils";
import { LocalEnvProvider } from "../../common/local/localEnvProvider";
import { CoreHookContext } from "../types";
import { TOOLS } from "../globalVars";
import { getLocalizedString } from "../../common/localizeUtils";
import { convertToAlphanumericOnly, getProjectTemplatesFolderPath } from "../../common/utils";
import { Container } from "typedi";
import { BicepComponent } from "../../component/bicep";
import { getComponent } from "../../component/workflow";
import { bicepUtils, createContextV3, generateConfigBiceps } from "../../component/utils";
import { assign, cloneDeep } from "lodash";
import { IdentityResource } from "../../component/resource/identity";
import { AzureFunctionResource } from "../../component/resource/azureAppService/azureFunction";
import { KeyVaultResource } from "../../component/resource/keyVault";
import { AzureSqlResource } from "../../component/resource/azureSql/azureSql";
import { AadApp } from "../../component/resource/aadApp/aadApp";
import { convertProjectSettingsV2ToV3 } from "../../component/migrate";
import {
  hasApi,
  hasAzureResourceV3,
  hasAzureTab,
  hasBot as hasBotV3,
  hasSPFxTab,
} from "../../common/projectSettingsHelperV3";
import { APIMResource } from "../../component/resource/apim/apim";

const programmingLanguage = "programmingLanguage";
const defaultFunctionName = "defaultFunctionName";
export const learnMoreText = getLocalizedString("core.option.learnMore");
export const upgradeButton = getLocalizedString("core.option.upgrade");
const solutionName = "solution";
const subscriptionId = "subscriptionId";
const resourceGroupName = "resourceGroupName";
const parameterFileNameTemplate = "azure.parameters.@envName.json";
const learnMoreLink = "https://aka.ms/teamsfx-migration-guide";
const manualUpgradeLink = `${learnMoreLink}#upgrade-your-project-manually`;
const upgradeReportName = `upgrade-change-logs.md`;
const AadSecret = "{{ $env.AAD_APP_CLIENT_SECRET }}";
const ChangeLogsFlag = "openUpgradeChangelogs";
const AADClientSecretFlag = "NeedToSetAADClientSecretEnv";

const gitignoreFileName = ".gitignore";
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
  static readonly SqlSkipAddingUser = "skipAddingUser";
  static readonly SkuName = "skuName";
  static readonly AppServicePlanName = "appServicePlanName";
  static readonly StorageAccountName = "storageAccountName";
  static readonly StorageResourceId = "storageResourceId";
  static readonly FuncAppName = "functionAppName";
  static readonly FunctionAppResourceId = "functionAppResourceId";
  static readonly Endpoint = "endpoint";
  static readonly ServiceName = "serviceName";
  static readonly ProductId = "productId";
  static readonly OAuthServerId = "oAuthServerId";
  static readonly ServiceResourceId = "serviceResourceId";
  static readonly ProductResourceId = "productResourceId";
  static readonly AuthServerResourceId = "authServerResourceId";
  static readonly AadSkipProvision = "skipProvision";
  static readonly OAuthScopeId = "oauth2PermissionScopeId";
  static readonly ClientId = "clientId";
  static readonly ClientSecret = "clientSecret";
  static readonly ObjectId = "objectId";
}

export class ArmParameters {
  static readonly FEStorageName = "frontendHostingStorageName";
  static readonly IdentityName = "userAssignedIdentityName";
  static readonly SQLServer = "sqlServerName";
  static readonly SQLDatabase = "sqlDatabaseName";
  static readonly SimpleAuthSku = "simpleAuthSku";
  static readonly functionServerName = "functionServerfarmsName";
  static readonly functionStorageName = "functionStorageName";
  static readonly functionAppName = "functionWebappName";
  static readonly botWebAppSku = "botWebAppSKU";
  static readonly SimpleAuthWebAppName = "simpleAuthWebAppName";
  static readonly SimpleAuthServerFarm = "simpleAuthServerFarmsName";
  static readonly ApimServiceName = "apimServiceName";
  static readonly ApimProductName = "apimProductName";
  static readonly ApimOauthServerName = "apimOauthServerName";
}

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if ((await needMigrateToArmAndMultiEnv(ctx)) && checkMethod(ctx)) {
    if (!checkUserTasks(ctx)) {
      ctx.result = ok(undefined);
      return;
    }

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotificationStart);
    const res = await TOOLS?.ui.showMessage(
      "warn",
      getLocalizedString("core.migrationToArmAndMultiEnv.Message"),
      true,
      upgradeButton
    );
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != upgradeButton) {
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
        [TelemetryProperty.Status]: ProjectMigratorStatus.Cancel,
      });
      ctx.result = err(UpgradeCanceledError());
      outputCancelMessage(ctx);
      return;
    }
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorNotification, {
      [TelemetryProperty.Status]: ProjectMigratorStatus.OK,
    });

    try {
      await migrateToArmAndMultiEnv(ctx);
      // return ok for the lifecycle functions to prevent breaking error handling logic.
      ctx.result = ok({});
    } catch (error) {
      // Strictly speaking, this telemetry event is not required because errorHandlerMW will send error telemetry anyway.
      // But it makes it easier to separate projectMigratorMW errors from other provision errors.
      sendTelemetryErrorEvent(
        Component.core,
        TelemetryEvent.ProjectMigratorError,
        assembleError(error, CoreSource)
      );
      throw error;
    }
  } else {
    // continue next step only when:
    // 1. no need to upgrade the project;
    // 2. no need to update Teams Toolkit version;
    await next();
  }
};

export function outputCancelMessage(ctx: CoreHookContext) {
  TOOLS?.logProvider.warning(`[core] Upgrade cancelled.`);
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (inputs.platform === Platform.VSCode) {
    TOOLS?.logProvider.warning(
      `[core] Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit. If you want to upgrade, please run command (Teams: Upgrade project) or click the “Upgrade project” button on tree view to trigger the upgrade.`
    );
    TOOLS?.logProvider.warning(
      `[core]If you are not ready to upgrade and want to continue to use the old version Teams Toolkit, please find Teams Toolkit in Extension and install the version <= 2.10.0`
    );
  } else {
    TOOLS?.logProvider.warning(
      `[core] Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit CLI. If you want to upgrade, please trigger this command again.`
    );
    TOOLS?.logProvider.warning(
      `[core]If you are not ready to upgrade and want to continue to use the old version Teams Toolkit CLI, please install the version <= 2.10.0`
    );
  }
}

export function checkMethod(ctx: CoreHookContext): boolean {
  const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);
  if (ctx.method && methods.has(ctx.method) && fromReloadFlag) return false;
  fromReloadFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}

export function checkUserTasks(ctx: CoreHookContext): boolean {
  const userTaskArgs: Set<string> = new Set(["getProgrammingLanguage", "getLocalDebugEnvs"]);
  const userTaskMethod = ctx.arguments[0]?.["method"];
  if (ctx.method === "executeUserTask" && userTaskArgs.has(userTaskMethod)) {
    return false;
  }
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
    const hostType = solutionSettings?.hostType;
    const result: { [key: string]: string } = { [TelemetryProperty.HostType]: hostType };

    if (hostType === HostTypeOptionAzure().id || hostType === HostTypeOptionSPFx().id) {
      result[TelemetryProperty.ActivePlugins] = JSON.stringify(
        solutionSettings!.activeResourcePlugins
      );
      result[TelemetryProperty.Capabilities] = JSON.stringify(solutionSettings!.capabilities);
    }
    if (hostType === HostTypeOptionAzure().id) {
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

  try {
    await preCheckKeyFiles(projectPath, ctx);
  } catch (err) {
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.ProjectMigratorPrecheckFailed,
      assembleError(err, CoreSource)
    );
    return;
  }

  let backupFolder: string | undefined;
  try {
    backupFolder = await getBackupFolder(projectPath);
    await backup(projectPath, backupFolder);
    await updateConfig(ctx);

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateMultiEnvStart);
    const projectSettings = await migrateMultiEnv(projectPath, TOOLS.logProvider);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateMultiEnv);
    ctx.projectSettings = projectSettings;
    if (!isSPFxProject(projectSettings)) {
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateArmStart);
      await migrateArm(ctx);
      sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrateArm);
    }
  } catch (err) {
    TOOLS?.logProvider.error(`[core] Failed to upgrade project, error: '${err}'`);
    await handleError(projectPath, ctx, backupFolder);
    throw err;
  }
  await postMigration(projectPath, ctx, inputs, backupFolder);
}

async function getManifestPath(fx: string, projectPath: string): Promise<string> {
  if (await fs.pathExists(path.join(projectPath, AppPackageFolderName, REMOTE_MANIFEST))) {
    return path.join(projectPath, AppPackageFolderName, REMOTE_MANIFEST);
  }
  // 2.3.2<= version <= 2.4.1
  if (await fs.pathExists(path.join(fx, AppPackageFolderName, REMOTE_MANIFEST))) {
    return path.join(fx, AppPackageFolderName, REMOTE_MANIFEST);
  }
  // 2.0.1 <= version <= 2.3.1
  return path.join(fx, REMOTE_MANIFEST);
}

async function preCheckKeyFiles(projectPath: string, ctx: CoreHookContext): Promise<void> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  const manifestPath = await getManifestPath(fx, projectPath);
  await preReadJsonFile(path.join(fx, "env.default.json"));
  await preReadJsonFile(path.join(fx, "settings.json"));
  await preReadJsonFile(manifestPath);
}

async function preReadJsonFile(path: string): Promise<void> {
  try {
    await fs.readJson(path);
  } catch (err) {
    TOOLS?.logProvider.error(
      `'${path}' doesn't exist or is not in json format. Please fix it and try again by running command (Teams: Upgrade project).`
    );
    TOOLS?.logProvider.warning(`Read this wiki(${learnMoreLink}) for the FAQ.`);

    TOOLS?.ui
      .showMessage(
        "info",
        getLocalizedString("core.migrationToArmAndMultiEnv.PreCheckErrorMessage", path),
        false,
        learnMoreText
      )
      .then((result) => {
        const userSelected = result.isOk() ? result.value : undefined;
        if (userSelected === learnMoreText) {
          TOOLS?.ui!.openUrl(manualUpgradeLink);
        }
      });
    throw NotJsonError(err);
  }
}

async function handleError(
  projectPath: string,
  ctx: CoreHookContext,
  backupFolder: string | undefined
) {
  try {
    await cleanup(projectPath, backupFolder);
  } catch (e) {
    // try my best to cleanup
    TOOLS?.logProvider.error(`[core] Failed to cleanup the backup, error: '${e}'`);
  }
  TOOLS?.ui
    .showMessage(
      "info",
      getLocalizedString("core.migrationToArmAndMultiEnv.ErrorMessage"),
      false,
      learnMoreText
    )
    .then((result) => {
      const userSelected = result.isOk() ? result.value : undefined;
      if (userSelected === learnMoreText) {
        TOOLS?.ui!.openUrl(manualUpgradeLink);
      }
    });
}

async function generateUpgradeReport(backupFolder: string | undefined) {
  try {
    if (backupFolder) {
      const target = path.join(backupFolder, upgradeReportName);
      const source = path.resolve(path.join(getResourceFolder(), upgradeReportName));
      await fs.copyFile(source, target);
    }
  } catch (error) {
    // do nothing
  }
}

async function postMigration(
  projectPath: string,
  ctx: CoreHookContext,
  inputs: Inputs,
  backupFolder: string | undefined
): Promise<void> {
  await removeOldProjectFiles(projectPath);
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorMigrate);
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorGuideStart);
  await generateUpgradeReport(backupFolder);
  await updateGitIgnore(projectPath, TOOLS.logProvider, backupFolder);

  TOOLS?.logProvider.warning(
    `[core] Upgrade success! All old files in .fx and appPackage folder have been backed up to the .backup folder and you can delete it. Read this wiki(${learnMoreLink}) if you want to restore your configuration files or learn more about this upgrade.`
  );
  TOOLS?.logProvider.warning(
    `[core] Read upgrade-change-logs.md to learn about details for this upgrade.`
  );

  if (inputs.platform === Platform.VSCode) {
    await globalStateUpdate(ChangeLogsFlag, true);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectMigratorGuide, {
      [TelemetryProperty.Status]: ProjectMigratorGuideStatus.Reload,
    });
    await TOOLS?.ui.reload?.();
  } else {
    TOOLS?.logProvider.info(getLocalizedString("core.migrationToArmAndMultiEnv.SuccessMessage"));
  }
}

async function updateGitIgnore(
  projectPath: string,
  log: LogProvider,
  backupFolder: string | undefined
): Promise<void> {
  // add .fx/configs/localSetting.json to .gitignore
  const localSettingsProvider = new LocalSettingsProvider(projectPath);
  await addPathToGitignore(projectPath, localSettingsProvider.localSettingsFilePath, log);

  // add .fx/subscriptionInfo.json to .gitignore
  const subscriptionInfoPath = path.join(
    projectPath,
    `.${ConfigFolderName}`,
    "subscriptionInfo.json"
  );
  await addPathToGitignore(projectPath, subscriptionInfoPath, log);

  // add build/ to .gitignore
  const buildFolder = path.join(projectPath, BuildFolderName);
  await addPathToGitignore(projectPath, buildFolder, log);

  // add **/.env.teamsfx.local to .gitignore
  const envLocal = "**/" + LocalEnvProvider.LocalEnvFileName;
  await addItemToGitignore(projectPath, envLocal, log);

  // add .fx/states/*.userdata to .gitignore
  const userdata = `.${ConfigFolderName}/${StatesFolderName}/*.userdata`;
  await addItemToGitignore(projectPath, userdata, log);

  if (backupFolder) {
    await addPathToGitignore(projectPath, backupFolder, log);
  }
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

async function generateLocalTemplate(manifestString: string, isSPFx: boolean, log: LogProvider) {
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
  manifest.name.short = getLocalAppName(manifest.name.short);
  manifest.id = "{{localSettings.teamsApp.teamsAppId}}";

  // SPFx teams workbench url needs to be updated
  if (isSPFx) {
    if (manifest.configurableTabs) {
      for (const [index, tab] of manifest.configurableTabs.entries()) {
        const reg = /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;
        const result = tab.configurationUrl.match(reg);
        if (result && result.length > 0) {
          const componentID = result[0];
          tab.configurationUrl = `https://{teamSiteDomain}{teamSitePath}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest={teamSitePath}/_layouts/15/TeamsWorkBench.aspx%3FcomponentId=${componentID}%26openPropertyPane=true%26teams%26forceLocale={locale}%26loadSPFX%3Dtrue%26debugManifestsFile%3Dhttps%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fmanifests.js`;
        } else {
          const message = `[core] Cannot find componentID in configurableTabs[${index}].configrationUrl, Teams workbench debug may fail.`;
          log.warning(message);
        }
      }
    }
    if (manifest.staticTabs) {
      for (const tab of manifest.staticTabs) {
        const componentID = tab.entityId;
        tab.contentUrl = `https://{teamSiteDomain}/_layouts/15/TeamsLogon.aspx?SPFX=true&dest={teamSitePath}/_layouts/15/TeamsWorkBench.aspx%3FcomponentId=${componentID}%26teams%26personal%26forceLocale={locale}%26loadSPFX%3Dtrue%26debugManifestsFile%3Dhttps%3A%2F%2Flocalhost%3A4321%2Ftemp%2Fmanifests.js`;
      }
    }
  }

  return manifest;
}

async function getManifest(sourceManifestFile: string): Promise<TeamsAppManifest> {
  return await fs.readJson(sourceManifestFile);
}

async function copyManifest(projectPath: string, fx: string, target: string) {
  if (await fs.pathExists(path.join(projectPath, AppPackageFolderName))) {
    await fs.copy(path.join(projectPath, AppPackageFolderName), target);
  } else if (await fs.pathExists(path.join(fx, AppPackageFolderName))) {
    // version <= 2.4.1
    await fs.copy(path.join(fx, AppPackageFolderName), target);
  } else {
    // version <= 2.3.1
    await fs.copy(path.join(fx, REMOTE_MANIFEST), path.join(target, REMOTE_MANIFEST));
    const manifest: TeamsAppManifest = await getManifest(path.join(target, REMOTE_MANIFEST));
    const color = (await fs.pathExists(path.join(fx, "color.png")))
      ? "color.png"
      : manifest.icons.color;
    const outline = (await fs.pathExists(path.join(fx, "outline.png")))
      ? "outline.png"
      : manifest.icons.outline;

    if (color !== "" && (await fs.pathExists(path.join(fx, color)))) {
      await fs.copy(path.join(fx, color), path.join(target, color));
    }
    if (outline !== "" && (await fs.pathExists(path.join(fx, outline)))) {
      await fs.copy(path.join(fx, outline), path.join(target, outline));
    }
  }
}
async function migrateProjectSettings(projectPath: string): Promise<ProjectSettingsV3> {
  const loadRes = await loadProjectSettingsByProjectPath(projectPath, false);
  if (loadRes.isErr()) {
    throw ProjectSettingError();
  }
  const projectSettings = loadRes.value as ProjectSettingsV3;
  if (hasAzureResourceV3(projectSettings, true)) {
    if (!getComponent(projectSettings, ComponentNames.Identity)) {
      projectSettings.components.push({ name: ComponentNames.Identity });
    }
  }
  return projectSettings;
}
async function migrateMultiEnv(projectPath: string, log: LogProvider): Promise<ProjectSettingsV3> {
  const { fx, fxConfig, templateAppPackage, fxState } = await getMultiEnvFolders(projectPath);
  const {
    hasFrontend,
    hasBackend,
    hasBot,
    hasBotCapability,
    hasMessageExtensionCapability,
    isSPFx,
    hasProvision,
  } = await queryProjectStatus(fx);

  //localSettings.json
  const localSettingsProvider = new LocalSettingsProvider(projectPath);
  await localSettingsProvider.save(localSettingsProvider.init(hasFrontend, hasBackend, hasBot));

  const projectSettings = await migrateProjectSettings(projectPath);

  const projectSettingsPath = getProjectSettingsPath(projectPath);
  const configDevJsonFilePath = path.join(fxConfig, "config.dev.json");
  const envDefaultFilePath = path.join(fx, "env.default.json");
  await ensureProjectSettings(projectSettings, envDefaultFilePath);
  await fs.writeFile(projectSettingsPath, JSON.stringify(projectSettings, null, 4));

  const appName = projectSettings.appName;
  //config.dev.json
  const configDev = getConfigDevJson(appName!);

  // migrate skipAddingSqlUser
  const envDefault = await fs.readJson(envDefaultFilePath);

  if (envDefault[ResourcePlugins.AzureSQL]?.[EnvConfigName.SqlSkipAddingUser]) {
    configDev["skipAddingSqlUser"] =
      envDefault[ResourcePlugins.AzureSQL][EnvConfigName.SqlSkipAddingUser];
  }
  if (envDefault[ResourcePlugins.Aad]?.[EnvConfigName.AadSkipProvision] === "true") {
    configDev.auth = {};
    if (envDefault[ResourcePlugins.Aad][EnvConfigName.OAuthScopeId]) {
      configDev.auth!.accessAsUserScopeId =
        envDefault[ResourcePlugins.Aad][EnvConfigName.OAuthScopeId];
    }
    if (envDefault[ResourcePlugins.Aad][EnvConfigName.ObjectId]) {
      configDev.auth!.objectId = envDefault[ResourcePlugins.Aad][EnvConfigName.ObjectId];
    }
    if (envDefault[ResourcePlugins.Aad][EnvConfigName.ClientId]) {
      configDev.auth!.clientId = envDefault[ResourcePlugins.Aad][EnvConfigName.ClientId];
    }
    if (envDefault[ResourcePlugins.Aad][EnvConfigName.ClientSecret]) {
      await globalStateUpdate(
        AADClientSecretFlag,
        envDefault[ResourcePlugins.Aad][EnvConfigName.ClientSecret]
      );
      configDev.auth!.clientSecret = AadSecret;
    }
  }
  await fs.writeFile(configDevJsonFilePath, JSON.stringify(configDev, null, 4));

  // appPackage
  await copyManifest(projectPath, fx, templateAppPackage);
  const sourceManifestFile = path.join(templateAppPackage, REMOTE_MANIFEST);
  const manifest: TeamsAppManifest = await getManifest(sourceManifestFile);
  await fs.remove(sourceManifestFile);
  // generate manifest.remote.template.json
  const targetRemoteManifestFile = path.join(templateAppPackage, MANIFEST_TEMPLATE);
  const remoteManifest = await generateRemoteTemplate(JSON.stringify(manifest));
  await fs.writeFile(targetRemoteManifestFile, JSON.stringify(remoteManifest, null, 4));

  // generate manifest.local.template.json
  const localManifest: TeamsAppManifest = await generateLocalTemplate(
    JSON.stringify(manifest),
    isSPFx,
    log
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

  // state.dev.json / dev.userdata
  const devState = path.join(fxState, "state.dev.json");
  await fs.copy(path.join(fx, "new.env.default.json"), devState);
  const devUserData = path.join(fxState, "dev.userdata");
  if (await fs.pathExists(path.join(fx, "default.userdata"))) {
    await fs.copy(path.join(fx, "default.userdata"), devUserData);
  }
  await removeExpiredFields(devState, devUserData);
  return projectSettings;
}
export class LocalDebugConfigKeys {
  public static readonly LocalAuthEndpoint: string = "localAuthEndpoint";

  public static readonly LocalTabEndpoint: string = "localTabEndpoint";
  public static readonly LocalTabDomain: string = "localTabDomain";
  public static readonly TrustDevelopmentCertificate: string = "trustDevCert";

  public static readonly LocalFunctionEndpoint: string = "localFunctionEndpoint";

  public static readonly LocalBotEndpoint: string = "localBotEndpoint";
  public static readonly LocalBotDomain: string = "localBotDomain";
}
async function removeExpiredFields(devState: string, devUserData: string): Promise<void> {
  const stateData = await fs.readJson(devState);
  if (stateData[PluginNames.SOLUTION] && stateData[PluginNames.SOLUTION]["remoteTeamsAppId"]) {
    stateData[PluginNames.APPST]["teamsAppId"] =
      stateData[PluginNames.SOLUTION]["remoteTeamsAppId"];
  }
  const expiredStateKeys: [string, string][] = [
    [PluginNames.LDEBUG, ""],
    // for version 2.0.1
    [PluginNames.FUNC, defaultFunctionName],
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
  await fs.writeFile(devState, JSON.stringify(stateData, null, 4), { encoding: "UTF-8" });

  if (await fs.pathExists(devUserData)) {
    const secrets: Record<string, string> = dotenv.parse(await fs.readFile(devUserData, "UTF-8"));
    for (const [_, value] of Object.entries(LocalDebugConfigKeys)) {
      deleteUserDataKey(secrets, `${PluginNames.LDEBUG}.${value}`);
    }
    deleteUserDataKey(secrets, `${PluginNames.AAD}.local_clientSecret`);
    await fs.writeFile(devUserData, serializeDict(secrets), { encoding: "UTF-8" });
  }
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
  const settings: ProjectSettings = await fs.readJson(path.join(fx, "settings.json"));
  const settingsV3 = convertProjectSettingsV2ToV3(settings, "");
  const envDefaultJson: { solution: { provisionSucceeded: boolean } } = await fs.readJson(
    path.join(fx, "env.default.json")
  );
  const hasFrontend = hasAzureTab(settingsV3);
  const hasBackend = hasApi(settingsV3);
  const hasBot = hasBotV3(settingsV3);
  const hasBotCapability = settings.solutionSettings!.capabilities.includes(BotOptionItem().id);
  const hasMessageExtensionCapability = settings.solutionSettings!.capabilities.includes(
    MessageExtensionItem().id
  );
  const isSPFx = hasSPFxTab(settingsV3);
  const hasProvision = envDefaultJson.solution?.provisionSucceeded as boolean;
  return {
    hasFrontend,
    hasBackend,
    hasBot,
    hasBotCapability,
    hasMessageExtensionCapability,
    isSPFx,
    hasProvision,
  };
}

async function getMultiEnvFolders(projectPath: string): Promise<any> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAppPackage = path.join(
    await getProjectTemplatesFolderPath(projectPath),
    AppPackageFolderName
  );
  const fxState = path.join(fx, StatesFolderName);
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAppPackage);
  return { fx, fxConfig, templateAppPackage, fxState };
}

async function getBackupFolder(projectPath: string): Promise<string> {
  const backupName = ".backup";
  const backupPath = path.join(projectPath, backupName);
  if (!(await fs.pathExists(backupPath))) {
    return backupPath;
  }
  // avoid conflict(rarely)
  return path.join(projectPath, `.teamsfx${backupName}`);
}

async function backup(projectPath: string, backupFolder: string): Promise<void> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  const backupFx = path.join(backupFolder, `.${ConfigFolderName}`);
  const backupAppPackage = path.join(backupFolder, AppPackageFolderName);
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

  await copyManifest(projectPath, fx, backupAppPackage);
}

// append folder path to .gitignore under the project root.
export async function addPathToGitignore(
  projectPath: string,
  ignoredPath: string,
  log: LogProvider
): Promise<void> {
  const relativePath = path.relative(projectPath, ignoredPath).replace(/\\/g, "/");
  await addItemToGitignore(projectPath, relativePath, log);
}

// append item to .gitignore under the project root.
async function addItemToGitignore(
  projectPath: string,
  item: string,
  log: LogProvider
): Promise<void> {
  const gitignorePath = path.join(projectPath, gitignoreFileName);
  try {
    await fs.ensureFile(gitignorePath);

    const gitignoreContent = await fs.readFile(gitignorePath, "UTF-8");
    if (gitignoreContent.indexOf(item) === -1) {
      const appendedContent = os.EOL + item;
      await fs.appendFile(gitignorePath, appendedContent);
    }
  } catch {
    log.warning(`[core] Failed to add '${item}' to '${gitignorePath}', please do it manually.`);
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
  // version <= 3.2.1
  await fs.remove(path.join(fx, REMOTE_MANIFEST));
  await fs.remove(path.join(fx, "color.png"));
  await fs.remove(path.join(fx, "outline.png"));
}

async function ensureProjectSettings(
  settings: ProjectSettingsV3,
  envDefaultPath: string
): Promise<void> {
  if (!settings.programmingLanguage || !settings.defaultFunctionName) {
    const envDefault = await fs.readJson(envDefaultPath);
    settings.programmingLanguage =
      settings.programmingLanguage || envDefault[PluginNames.SOLUTION]?.[programmingLanguage];
    settings.defaultFunctionName =
      settings.defaultFunctionName || envDefault[PluginNames.FUNC]?.[defaultFunctionName];
  }
  settings.version = "2.0.0";
}

async function cleanup(projectPath: string, backupFolder: string | undefined): Promise<void> {
  const { _, fxConfig, templateAppPackage, fxState } = await getMultiEnvFolders(projectPath);
  await fs.remove(fxConfig);
  await fs.remove(templateAppPackage);
  await fs.remove(fxState);
  await fs.remove(path.join(templateAppPackage, ".."));
  if (await fs.pathExists(path.join(fxConfig, "..", "new.env.default.json"))) {
    await fs.remove(path.join(fxConfig, "..", "new.env.default.json"));
  }
  if (backupFolder) {
    await fs.remove(backupFolder);
  }
}

export async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
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

export async function migrateArm(ctx: CoreHookContext) {
  await generateArmTemplatesFiles(ctx);
  await generateArmParameterJson(ctx);
}

async function updateConfig(ctx: CoreHookContext) {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const fx = path.join(inputs.projectPath as string, `.${ConfigFolderName}`);
  const envConfig = await fs.readJson(path.join(fx, "env.default.json"));
  if (envConfig[ResourcePlugins.Bot]) {
    delete envConfig[ResourcePlugins.Bot];
    envConfig[ResourcePlugins.Bot] = { wayToRegisterBot: "create-new" };
    envConfig.solution.provisionSucceeded = false;
  }
  let needUpdate = false;
  let configPrefix = "";
  if (envConfig[solutionName][subscriptionId] && envConfig[solutionName][resourceGroupName]) {
    configPrefix = `/subscriptions/${envConfig[solutionName][subscriptionId]}/resourcegroups/${envConfig[solutionName][resourceGroupName]}`;
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
      EnvConfigName.FunctionAppResourceId
    ] = `${configPrefix}/providers/Microsoft.Web/sites/${
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

  if (needUpdate && envConfig[ResourcePlugins.Apim]?.[EnvConfigName.ServiceName]) {
    envConfig[ResourcePlugins.Apim][
      EnvConfigName.ServiceResourceId
    ] = `${configPrefix}/providers/Microsoft.ApiManagement/service/${
      envConfig[ResourcePlugins.Apim][EnvConfigName.ServiceName]
    }`;
    delete envConfig[ResourcePlugins.Apim][EnvConfigName.ServiceName];

    if (envConfig[ResourcePlugins.Apim]?.[EnvConfigName.ProductId]) {
      envConfig[ResourcePlugins.Apim][EnvConfigName.ProductResourceId] = `${
        envConfig[ResourcePlugins.Apim][EnvConfigName.ServiceResourceId]
      }/products/${envConfig[ResourcePlugins.Apim][EnvConfigName.ProductId]}`;
      delete envConfig[ResourcePlugins.Apim][EnvConfigName.ProductId];
    }
    if (envConfig[ResourcePlugins.Apim]?.[EnvConfigName.OAuthServerId]) {
      envConfig[ResourcePlugins.Apim][EnvConfigName.AuthServerResourceId] = `${
        envConfig[ResourcePlugins.Apim][EnvConfigName.ServiceResourceId]
      }/authorizationServers/${envConfig[ResourcePlugins.Apim][EnvConfigName.OAuthServerId]}`;
      delete envConfig[ResourcePlugins.Apim][EnvConfigName.OAuthServerId];
    }
  }
  await fs.writeFile(path.join(fx, "new.env.default.json"), JSON.stringify(envConfig, null, 4));
}

export async function generateBicepsV3(
  projectSettings: ProjectSettingsV3,
  inputs: InputsWithProjectPath
): Promise<Result<undefined, FxError>> {
  //init bicep folder
  {
    const bicepComponent = Container.get<BicepComponent>("bicep");
    const res = await bicepComponent.init(inputs.projectPath!);
    if (res.isErr()) return err(res.error);
  }
  const biceps: Bicep[] = [];
  const context = createContextV3(projectSettings);
  // teams-tab
  {
    const config = getComponent(projectSettings, ComponentNames.TeamsTab);
    if (config) {
      const hosting = config.hosting! || ComponentNames.AzureStorage;
      const hostingComponent = Container.get<CloudResource>(hosting);
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        componentId: ComponentNames.TeamsTab,
        scenario: Scenarios.Tab,
      });
      const res = await hostingComponent.generateBicep!(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // teams-bot
  {
    const config = getComponent(projectSettings, ComponentNames.TeamsBot);
    if (config) {
      // bot hosting
      const hosting = config.hosting! || ComponentNames.AzureWebApp;
      {
        const hostingComponent = Container.get<CloudResource>(hosting);
        const clonedInputs = cloneDeep(inputs);
        assign(clonedInputs, {
          componentId: ComponentNames.TeamsBot,
          scenario: Scenarios.Bot,
        });
        const res = await hostingComponent.generateBicep!(context, clonedInputs);
        if (res.isErr()) return err(res.error);
        res.value.forEach((b: Bicep) => biceps.push(b));
      }
      // bot service
      {
        const clonedInputs = cloneDeep(inputs);
        assign(clonedInputs, {
          hosting: hosting,
          scenario: Scenarios.Bot,
        });
        const botService = Container.get(ComponentNames.BotService) as any;
        const res = await botService.generateBicep(context, clonedInputs);
        if (res.isErr()) return err(res.error);
        (res.value as Bicep[]).forEach((b: Bicep) => biceps.push(b));
      }
    }
  }

  // teams-api
  {
    const config = getComponent(projectSettings, ComponentNames.TeamsApi);
    if (config) {
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        componentId: ComponentNames.TeamsApi,
        hosting: ComponentNames.Function,
        scenario: Scenarios.Api,
      });
      const functionComponent = Container.get<AzureFunctionResource>(ComponentNames.Function);
      const res = await functionComponent.generateBicep(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // identity
  {
    const identity = getComponent(projectSettings, ComponentNames.Identity);
    if (identity) {
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        componentId: "",
        scenario: "",
      });
      const identityComponent = Container.get<IdentityResource>(ComponentNames.Identity);
      const res = await identityComponent.generateBicep(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // apim
  {
    const config = getComponent(projectSettings, ComponentNames.APIM);
    if (config) {
      const resource = Container.get<APIMResource>(ComponentNames.APIM);
      const res = await resource.generateBicep(context, inputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // keyvault
  {
    const config = getComponent(projectSettings, ComponentNames.KeyVault);
    if (config) {
      const resource = Container.get<KeyVaultResource>(ComponentNames.KeyVault);
      const res = await resource.generateBicep(context, inputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // sql
  {
    const config = getComponent(projectSettings, ComponentNames.AzureSQL);
    if (config) {
      const provisionType = "server";
      const clonedInputs = cloneDeep(inputs);
      clonedInputs.provisionType = provisionType;
      const sqlResource = Container.get<AzureSqlResource>(ComponentNames.AzureSQL);
      const res = await sqlResource.generateBicep(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // aad
  {
    const config = getComponent(projectSettings, ComponentNames.AadApp);
    if (config) {
      const aadApp = Container.get<AadApp>(ComponentNames.AadApp);
      const res = await aadApp.generateBicep(context, inputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b: Bicep) => biceps.push(b));
    }
  }

  // persist bicep
  {
    const bicepRes = await bicepUtils.persistBiceps(
      inputs.projectPath,
      convertToAlphanumericOnly(context.projectSetting.appName!),
      biceps
    );
    if (bicepRes.isErr()) return bicepRes;
  }

  //  generate config bicep
  {
    const res = await generateConfigBiceps(context, inputs);
    if (res.isErr()) return err(res.error);
  }
  return ok(undefined);
}

async function generateArmTemplatesFiles(ctx: CoreHookContext) {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as InputsWithProjectPath;
  const fx = path.join(inputs.projectPath as string, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAzure = path.join(inputs.projectPath as string, "templates", "azure");
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAzure);

  let projectSettings = ctx.projectSettings as ProjectSettingsV3;
  if (!projectSettings) {
    projectSettings = await migrateProjectSettings(inputs.projectPath);
  }
  const genRes = await generateBicepsV3(projectSettings, inputs);
  if (genRes.isErr()) throw genRes.error;
  const parameterEnvFileName = parameterFileNameTemplate.replace(
    "@envName",
    environmentManager.getDefaultEnvName()
  );
  if (!(await fs.pathExists(path.join(fxConfig, parameterEnvFileName)))) {
    throw new SystemError(
      CoreSource,
      "GenerateArmTemplateFailed",
      `Failed to generate ${parameterEnvFileName} on migration`
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
  const parameterObj = targetJson["parameters"]["provisionParameters"]["value"];
  // frontend hosting
  if (envConfig[ResourcePlugins.FrontendHosting]?.[EnvConfigName.StorageName]) {
    parameterObj[ArmParameters.FEStorageName] =
      envConfig[ResourcePlugins.FrontendHosting][EnvConfigName.StorageName];
  }
  // manage identity
  if (envConfig[ResourcePlugins.Identity]?.[EnvConfigName.Identity]) {
    // Teams Toolkit <= 2.7
    parameterObj[ArmParameters.IdentityName] =
      envConfig[ResourcePlugins.Identity][EnvConfigName.Identity];
  } else if (envConfig[ResourcePlugins.Identity]?.[EnvConfigName.IdentityName]) {
    // Teams Toolkit >= 2.8
    parameterObj[ArmParameters.IdentityName] =
      envConfig[ResourcePlugins.Identity][EnvConfigName.IdentityName];
  }
  // azure SQL
  if (envConfig[ResourcePlugins.AzureSQL]?.[EnvConfigName.SqlEndpoint]) {
    parameterObj[ArmParameters.SQLServer] =
      envConfig[ResourcePlugins.AzureSQL][EnvConfigName.SqlEndpoint].split(
        ".database.windows.net"
      )[0];
  }
  if (envConfig[ResourcePlugins.AzureSQL]?.[EnvConfigName.SqlDataBase]) {
    parameterObj[ArmParameters.SQLDatabase] =
      envConfig[ResourcePlugins.AzureSQL][EnvConfigName.SqlDataBase];
  }
  // SimpleAuth
  if (envConfig[ResourcePlugins.SimpleAuth]?.[EnvConfigName.SkuName]) {
    parameterObj[ArmParameters.SimpleAuthSku] =
      envConfig[ResourcePlugins.SimpleAuth][EnvConfigName.SkuName];
  }

  if (envConfig[ResourcePlugins.SimpleAuth]?.[EnvConfigName.Endpoint]) {
    const simpleAuthHost = new URL(envConfig[ResourcePlugins.SimpleAuth]?.[EnvConfigName.Endpoint])
      .hostname;
    const simpleAuthName = simpleAuthHost.split(".")[0];
    parameterObj[ArmParameters.SimpleAuthWebAppName] = parameterObj[
      ArmParameters.SimpleAuthServerFarm
    ] = simpleAuthName;
  }
  // Function
  if (envConfig[ResourcePlugins.Function]?.[EnvConfigName.AppServicePlanName]) {
    parameterObj[ArmParameters.functionServerName] =
      envConfig[ResourcePlugins.Function][EnvConfigName.AppServicePlanName];
  }
  if (envConfig[ResourcePlugins.Function]?.[EnvConfigName.StorageAccountName]) {
    parameterObj[ArmParameters.functionStorageName] =
      envConfig[ResourcePlugins.Function][EnvConfigName.StorageAccountName];
  }
  if (envConfig[ResourcePlugins.Function]?.[EnvConfigName.FuncAppName]) {
    parameterObj[ArmParameters.functionAppName] =
      envConfig[ResourcePlugins.Function][EnvConfigName.FuncAppName];
  }

  // Bot
  if (envConfig[ResourcePlugins.Bot]?.[EnvConfigName.SkuName]) {
    parameterObj[ArmParameters.botWebAppSku] =
      envConfig[ResourcePlugins.Bot]?.[EnvConfigName.SkuName];
  }

  // Apim
  if (envConfig[ResourcePlugins.Apim]?.[EnvConfigName.ServiceName]) {
    parameterObj[ArmParameters.ApimServiceName] =
      envConfig[ResourcePlugins.Apim]?.[EnvConfigName.ServiceName];
  }
  if (envConfig[ResourcePlugins.Apim]?.[EnvConfigName.ProductId]) {
    parameterObj[ArmParameters.ApimProductName] =
      envConfig[ResourcePlugins.Apim]?.[EnvConfigName.ProductId];
  }
  if (envConfig[ResourcePlugins.Apim]?.[EnvConfigName.OAuthServerId]) {
    parameterObj[ArmParameters.ApimOauthServerName] =
      envConfig[ResourcePlugins.Apim]?.[EnvConfigName.OAuthServerId];
  }

  await fs.writeFile(
    path.join(fxConfig, parameterEnvFileName),
    JSON.stringify(targetJson, null, 4)
  );
}
