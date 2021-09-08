// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppPackageFolderName,
  ConfigFolderName,
  EnvConfig,
  InputConfigsFolderName,
  Inputs,
  ProjectSettingsFileName,
  PublishProfilesFolderName,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { CoreHookContext, deserializeDict, NoProjectOpenedError, serializeDict } from "../..";
import { LocalSettingsProvider } from "../../common/localSettingsProvider";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import path from "path";
import { readJson } from "../../common/fileUtils";
import { PluginNames } from "../../plugins/solution/fx-solution/constants";

export const ProjectMigratorMW: Middleware = async (ctx: CoreHookContext, next: NextFunction) => {
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    // TODO: ui - user confirm
    const userCanceled = true;
    if (userCanceled) {
      return;
    }
    await migrateToArmAndMultiEnv(ctx);
  }
  await next();
};

async function migrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<void> {
  try {
    await migrateArm(ctx);
    await migrateMultiEnv(ctx);
  } catch (err) {
    // TODO: cleanup files if failed.
    await cleanup(ctx);
    throw err;
  }
  await removeOldProjectFiles();
}

async function migrateMultiEnv(ctx: CoreHookContext): Promise<void> {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  if (!inputs.projectPath) {
    throw NoProjectOpenedError();
  }

  const fx = path.join(inputs.projectPath, `.${ConfigFolderName}`);
  const fxConfig = path.join(fx, InputConfigsFolderName);
  const templateAppPackage = path.join(inputs.projectPath, "templates", AppPackageFolderName);
  const fxPublishProfile = path.join(fx, PublishProfilesFolderName);
  // TODO: search capability and resource
  const hasProvision = false;
  const hasTab = false;
  const hasBackend = false;
  const hasBot = false;

  await fs.ensureDir(fx);
  await fs.ensureDir(fxConfig);
  await fs.ensureDir(templateAppPackage);

  //config.dev.json
  await fs.writeFile(fxConfig, JSON.stringify(getConfigDevJson(), null, 4));
  //localSettings.json
  const localSettingsProvider = new LocalSettingsProvider(inputs.projectPath);
  await localSettingsProvider.save(localSettingsProvider.init(hasTab, hasBackend, hasBot));
  //projectSettings.json
  await fs.copy(path.join(fx, "settings.json"), path.join(fxConfig, ProjectSettingsFileName));
  // appPackage
  await fs.copy(path.join(fx, AppPackageFolderName), templateAppPackage);
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
  await fs.copy(
    path.join(templateAppPackage, manifest.icons.color),
    path.join(resource, manifest.icons.color)
  );
  await fs.copy(
    path.join(templateAppPackage, manifest.icons.outline),
    path.join(resource, manifest.icons.outline)
  );

  // update icons
  manifest.icons.color = path.join("resources", manifest.icons.color);
  manifest.icons.outline = path.join("resources", manifest.icons.outline);
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

async function removeOldProjectFiles(): Promise<void> {
  // TODO
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

async function cleanup(ctx: CoreHookContext) {}

async function needMigrateToArmAndMultiEnv(ctx: CoreHookContext): Promise<boolean> {
  return false;
}

async function migrateArm(ctx: CoreHookContext) {}
