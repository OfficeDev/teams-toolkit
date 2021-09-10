// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  ConfigFolderName,
  EnvConfig,
  InputConfigsFolderName,
  Inputs,
  ProjectSettings,
  ProjectSettingsFileName,
  PublishProfilesFolderName,
  TeamsAppManifest,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { CoreHookContext, deserializeDict, NoProjectOpenedError, serializeDict } from "../..";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import { readJson, checkFileExist } from "../../common/fileUtils";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";
import { FxCore } from "..";
import {
  isMultiEnvEnabled,
  isArmSupportEnabled,
  isBicepEnvCheckerEnabled,
} from "../../common/tools";

import { getActivatedResourcePlugins } from "../../plugins/solution/fx-solution/ResourcePluginContainer";

const MigrationMessage =
  "In order to continue using the latest Teams Toolkit, we will update your project code to use the latest Teams Toolkit. We recommend to initialize your workspace with git for better tracking file changes.";

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    const core = ctx.self as FxCore;
    const res = await core.tools.ui.showMessage("warn", MigrationMessage, true, "OK");
    const answer = res?.isOk() ? res.value : undefined;
    if (!answer || answer != "OK") {
      return;
    }
    await migrateToArmAndMultiEnv(ctx, inputs.projectPath);
  }
  await next();
};

async function migrateToArmAndMultiEnv(ctx: CoreHookContext, projectPath: string): Promise<void> {
  try {
    await migrateArm(ctx);
    await migrateMultiEnv(projectPath);
  } catch (err) {
    await cleanup(projectPath);
    throw err;
  }
  await removeOldProjectFiles(projectPath);
}

async function migrateMultiEnv(projectPath: string): Promise<void> {
  const { fx, fxConfig, templateAppPackage, fxPublishProfile } = await getMultiEnvFolders(
    projectPath
  );
  const { hasFrontend, hasBackend, hasBot, hasProvision } = await queryProjectStatus(fx);

  //config.dev.json
  await fs.writeFile(
    path.join(fxConfig, "config.dev.json"),
    JSON.stringify(getConfigDevJson(), null, 4)
  );
  //localSettings.json
  const localSettingsProvider = new LocalSettingsProvider(projectPath);
  await localSettingsProvider.save(localSettingsProvider.init(hasFrontend, hasBackend, hasBot));
  //projectSettings.json
  await fs.copy(path.join(fx, "settings.json"), path.join(fxConfig, ProjectSettingsFileName));
  // appPackage
  await fs.copy(path.join(projectPath, AppPackageFolderName), templateAppPackage);
  await fs.rename(
    path.join(templateAppPackage, "manifest.source.json"),
    path.join(templateAppPackage, "manifest.template.json")
  );
  await moveIconsToResourceFolder(templateAppPackage);

  if (hasProvision) {
    const devProfile = path.join(fxPublishProfile, "profile.dev.json");
    const devUserData = path.join(fxPublishProfile, "dev.userdata");
    await fs.copy(path.join(fx, "env.default.json"), devProfile);
    await fs.copy(path.join(fx, "default.userdata"), devUserData);
    // remove fx-resource-local-debug.trustDevCert
    await removeFxResourceLocalDebug(devProfile, devUserData);
  }
}

async function moveIconsToResourceFolder(templateAppPackage: string): Promise<void> {
  // see AppStudioPluginImpl.buildTeamsAppPackage()
  const manifest: TeamsAppManifest = await readJson(
    path.join(templateAppPackage, "manifest.template.json")
  );
  const hasColorIcon = manifest.icons.color && !manifest.icons.color.startsWith("https://");
  const hasOutlineIcon = manifest.icons.outline && !manifest.icons.outline.startsWith("https://");
  if (!hasColorIcon || !hasOutlineIcon) {
    return;
  }

  // move to resources
  const resource = path.join(templateAppPackage, "resources");
  await fs.ensureDir(resource);
  await fs.move(
    path.join(templateAppPackage, manifest.icons.color),
    path.join(resource, manifest.icons.color)
  );
  await fs.move(
    path.join(templateAppPackage, manifest.icons.outline),
    path.join(resource, manifest.icons.outline)
  );

  // update icons
  manifest.icons.color = `resources/${manifest.icons.color}`;
  manifest.icons.outline = `resources/${manifest.icons.outline}`;
  await fs.writeFile(
    path.join(templateAppPackage, "manifest.template.json"),
    JSON.stringify(manifest, null, 4)
  );
}

async function removeFxResourceLocalDebug(devProfile: string, devUserData: string): Promise<void> {
  const profileData: Map<string, any> = await readJson(devProfile);
  if (profileData.has(PluginNames.LDEBUG)) {
    profileData.delete(PluginNames.LDEBUG);
    await fs.writeFile(devProfile, JSON.stringify(profileData, null, 4), { encoding: "UTF-8" });
  }
  const secrets: Record<string, string> = deserializeDict(await fs.readFile(devUserData, "UTF-8"));
  if (secrets[PluginNames.LDEBUG]) {
    delete secrets[PluginNames.LDEBUG];
    await fs.writeFile(devUserData, serializeDict(secrets), { encoding: "UTF-8" });
  }
}

function getConfigDevJson(): EnvConfig {
  return {
    $schema:
      "https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/packages/api/src/schemas/envConfig.json",
    azure: {},
    manifest: {
      description:
        `You can customize the 'values' object to customize Teams app manifest for different environments.` +
        ` Visit https://aka.ms/teamsfx-config to learn more about this.`,
      values: {},
    },
  };
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
  const hasProvision = envDefaultJson.solution?.provisionSucceeded as boolean;
  return { hasFrontend, hasBackend, hasBot, hasProvision };
}

async function getMultiEnvFolders(projectPath: string): Promise<any> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAppPackage = path.join(projectPath, "templates", AppPackageFolderName);
  const fxPublishProfile = path.join(fx, PublishProfilesFolderName);
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAppPackage);
  return { fx, fxConfig, templateAppPackage, fxPublishProfile };
}

async function removeOldProjectFiles(projectPath: string): Promise<void> {
  const fx = path.join(projectPath, `.${ConfigFolderName}`);
  await fs.remove(path.join(fx, "env.default.json"));
  await fs.remove(path.join(fx, "default.userdata"));
  await fs.remove(path.join(fx, "settings.json"));
  await fs.remove(path.join(fx, "local.env"));
  await fs.remove(path.join(projectPath, AppPackageFolderName));
  // version <= 2.4.1, rmove .fx/appPackage.
  await fs.remove(path.join(fx, AppPackageFolderName));
}

async function cleanup(projectPath: string): Promise<void> {
  const { _, fxConfig, templateAppPackage, fxPublishProfile } = await getMultiEnvFolders(
    projectPath
  );
  await fs.remove(path.join(fxConfig, "config.dev.json"));
  await fs.remove(path.join(fxConfig, "localSettings.json"));
  await fs.remove(path.join(fxConfig, ProjectSettingsFileName));
  await fs.remove(templateAppPackage);
  await fs.remove(fxPublishProfile);
  // TODO: delte bicep files
}

async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
  // if (!preCheckEnvEnabled()) {
  //   return false;
  // }
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }
  const fxExist = await fs.pathExists(path.join(inputs.projectPath, ".fx"));
  if (!fxExist) {
    return false;
  }

  const envFileExist = await checkFileExist(
    path.join(inputs.projectPath, ".fx", "env.default.json")
  );
  const configDirExist = await fs.pathExists(path.join(inputs.projectPath, ".fx", "configs"));
  const armParameterExist = await checkFileExist(
    path.join(inputs.projectPath, ".fx", "configs", "azure.parameters.dev.json")
  );
  if (envFileExist && (!armParameterExist || !configDirExist)) {
    return true;
  }
  return false;
}

function preCheckEnvEnabled() {
  if (isMultiEnvEnabled() && isArmSupportEnabled() && isBicepEnvCheckerEnabled()) {
    return true;
  }
  return false;
}

async function migrateArm(ctx: CoreHookContext) {}
