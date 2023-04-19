// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  assembleError,
  ConfigFolderName,
  err,
  InputConfigsFolderName,
  Inputs,
  LogProvider,
  Platform,
  StatesFolderName,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import { isSPFxProject, getAppDirectory } from "../../common/tools";
import { environmentManager } from "../environment";
import { CoreSource, ConsolidateCanceledError } from "../error";
import { Middleware, NextFunction } from "@feathersjs/hooks/lib";
import fs from "fs-extra";
import * as os from "os";
import path from "path";
import { getLocalAppName } from "../../component/resource/appManifest/utils/utils";
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
import { getResourceFolder } from "../../folder";
import { loadProjectSettings } from "./projectSettingsLoader";
import { addPathToGitignore, needMigrateToArmAndMultiEnv } from "./projectMigrator";
import * as util from "util";
import { ManifestTemplate } from "../../component/resource/spfx/utils/constants";
import { generateAadManifest, needMigrateToAadManifest } from "./utils/MigrationUtils";
import { getManifestTemplatePath } from "../../component/resource/appManifest/utils/ManifestUtils";

const upgradeButton = getLocalizedString("core.option.upgrade");
const LearnMore = getLocalizedString("core.option.learnMore");
const LearnMoreLinkWithAADManifest = "https://aka.ms/teamsfx-unify-config-and-aad-manifest-guide";
const UnifyManifestLearMoreLink = "https://aka.ms/teamsfx-unify-local-remote-manifest-guide";
let userCancelFlag = false;
const backupFolder = ".backup";
const methods: Set<string> = new Set(["getProjectConfig", "checkPermission"]);
const upgradeWithAadManifestReportName = "unify-config-and-aad-manifest-change-logs.md";
const componentIdRegex = /(?<=componentId=)([a-z0-9-]*)(?=%26)/;
const manifestRegex = /{{{.*}}}|{{.*}}|{.*}/g;
const ignoreKeys: Set<string> = new Set([
  "name",
  "contentUrl",
  "configurationUrl",
  "manifestVersion",
  "$schema",
  "description",
]);
let needMigrateAadManifest = false;

export const ProjectConsolidateMW: Middleware = async (
  ctx: CoreHookContext,
  next: NextFunction
) => {
  if (await needMigrateToArmAndMultiEnv(ctx)) {
    next();
  } else if ((await needConsolidateLocalRemote(ctx)) && checkMethod(ctx)) {
    needMigrateAadManifest = await needMigrateToAadManifest(ctx);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateNotificationStart, {
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });
    let showModal = true;
    if (ctx.method && methods.has(ctx.method)) {
      showModal = false;
    }
    if (showModal) {
      await upgrade(ctx, next, true);
    } else {
      upgrade(ctx, next, false);
      await next();
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
      needMigrateAadManifest
        ? getLocalizedString("core.consolidateLocalRemoteWithAadManifest.Message")
        : getLocalizedString("core.consolidateLocalRemote.Message"),
      showModal,
      upgradeButton,
      LearnMore
    );
    answer = res?.isOk() ? res.value : undefined;
    if (answer === LearnMore) {
      TOOLS?.ui.openUrl(LearnMoreLinkWithAADManifest);
    }
  } while (answer === LearnMore);
  if (!answer || answer != upgradeButton) {
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateNotification, {
      [TelemetryProperty.Status]: ProjectMigratorStatus.Cancel,
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });
    ctx.result = err(ConsolidateCanceledError());
    outputCancelMessage(ctx);
    return;
  }
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateNotification, {
    [TelemetryProperty.Status]: ProjectMigratorStatus.OK,
    [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
  });

  try {
    await consolidateLocalRemote(ctx);
    if (showModal) {
      await next();
    }
  } catch (error) {
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.ProjectConsolidateError,
      assembleError(error, CoreSource),
      {
        [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
      }
    );
    throw error;
  }
}

// check if manifest.template.json exist
export async function needConsolidateLocalRemote(ctx: CoreHookContext): Promise<boolean> {
  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  if (!inputs.projectPath) {
    return false;
  }
  const fxExist = await fs.pathExists(path.join(inputs.projectPath as string, ".fx"));
  if (!fxExist) {
    return false;
  }

  const appDir = await getAppDirectory(inputs.projectPath as string);
  const consolidateManifestExist = await fs.pathExists(path.join(appDir, "manifest.template.json"));
  if (!consolidateManifestExist) {
    return true;
  }
  return false;
}

function outputCancelMessage(ctx: CoreHookContext) {
  TOOLS?.logProvider.warning(`[core] Upgrade cancelled.`);

  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  if (inputs.platform === Platform.VSCode) {
    TOOLS?.logProvider.warning(
      `[core] Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit. If you are not ready to upgrade and want to continue to use the old version Teams Toolkit, please find Teams Toolkit in Extension and install the version <= 3.7.0`
    );
  } else {
    TOOLS?.logProvider.warning(
      `[core] Notice upgrade to new configuration files is a must-have to continue to use current version Teams Toolkit CLI. If you want to upgrade, please trigger this command again.`
    );
    TOOLS?.logProvider.warning(
      `[core] If you are not ready to upgrade and want to continue to use the old version Teams Toolkit CLI, please install the version <= 3.7.0`
    );
  }
}

async function consolidateLocalRemote(ctx: CoreHookContext): Promise<boolean> {
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateUpgradeStart, {
    [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
  });
  const lastArg = ctx.arguments[ctx.arguments.length - 1];
  const inputs: Inputs = lastArg === ctx ? ctx.arguments[ctx.arguments.length - 2] : lastArg;
  const fileList: Array<string> = [];
  const removeMap = new Map<string, string>();
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
  try {
    // add local environment
    const appName = getLocalAppName(projectSettings.appName!);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateAddLocalEnvStart, {
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });
    const newEnvConfig = environmentManager.newEnvConfigData(appName);
    const writeEnvResult = await environmentManager.writeEnvConfig(
      inputs.projectPath!,
      newEnvConfig,
      environmentManager.getLocalEnvName()
    );
    if (writeEnvResult.isErr()) {
      throw err(writeEnvResult.error);
    }
    fileList.push(path.join(inputs.projectPath as string, ".fx", "configs", "env.local.json"));
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateAddLocalEnv, {
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });

    // add consolidate manifest
    let manifest: TeamsAppManifest | undefined;
    const remoteManifestFile = path.join(
      inputs.projectPath as string,
      "templates",
      "appPackage",
      "manifest.remote.template.json"
    );
    const remoteManifestExist = await fs.pathExists(remoteManifestFile);
    if (remoteManifestExist) {
      if (isSPFxProject(projectSettings)) {
        sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateAddSPFXManifestStart);
        const manifestTemplatePath = await getManifestTemplatePath(inputs.projectPath as string);
        const manifestString = (await fs.readFile(remoteManifestFile)).toString();
        manifest = JSON.parse(manifestString);
        let componentId = "";
        if (manifest?.staticTabs && manifest.staticTabs.length > 0) {
          manifest.staticTabs.forEach((item) => {
            componentId = item.entityId;
            if ((item.contentUrl && componentId === undefined) || componentId === "") {
              componentId = replaceSPFxComponentId(item.contentUrl as string);
            }
            const contentUrl = util.format(
              ManifestTemplate.REMOTE_CONTENT_URL,
              componentId,
              componentId
            );
            item.contentUrl = contentUrl;
          });
        }
        if (manifest?.configurableTabs && manifest.configurableTabs.length > 0) {
          manifest.configurableTabs.forEach((item) => {
            if ((item.configurationUrl && componentId === undefined) || componentId === "") {
              componentId = replaceSPFxComponentId(item.configurationUrl as string);
            }
            const configurationUrl = util.format(
              ManifestTemplate.REMOTE_CONFIGURATION_URL,
              componentId,
              componentId
            );
            item.configurationUrl = configurationUrl;
          });
        }
        await fs.writeFile(manifestTemplatePath, JSON.stringify(manifest, null, 4));
        sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateAddSPFXManifest);
      } else {
        sendTelemetryEvent(
          Component.core,
          TelemetryEvent.ProjectConsolidateCopyAzureManifestStart,
          {
            [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
          }
        );
        const manifestTemplatePath = await getManifestTemplatePath(inputs.projectPath as string);
        await fs.copyFile(remoteManifestFile, manifestTemplatePath);
        sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateCopyAzureManifest, {
          [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
        });
      }
    }
    fileList.push(
      path.join(inputs.projectPath as string, "templates", "appPackage", "template.manifest.json")
    );

    // copy and remove old configs
    const backupPath = path.join(inputs.projectPath as string, backupFolder);
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateBackupConfigStart, {
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });
    const localSettingsFile = path.join(
      inputs.projectPath as string,
      ".fx",
      "configs",
      "localSettings.json"
    );
    let moveFiles = "";
    if (await fs.pathExists(localSettingsFile)) {
      await fs.copy(
        localSettingsFile,
        path.join(backupPath, ".fx", "configs", "localSettings.json"),
        { overwrite: true }
      );
      await fs.remove(localSettingsFile);
      moveFiles += "localSettings.json,";
      removeMap.set(
        path.join(backupPath, ".fx", "configs", "localSettings.json"),
        localSettingsFile
      );
    }
    const localManifestFile = path.join(
      inputs.projectPath as string,
      "templates",
      "appPackage",
      "manifest.local.template.json"
    );
    if ((await fs.pathExists(localManifestFile)) && (await fs.pathExists(remoteManifestFile))) {
      await compareLocalAndRemoteManifest(localManifestFile, remoteManifestFile);
    }
    if (await fs.pathExists(localManifestFile)) {
      await fs.copy(
        localManifestFile,
        path.join(backupPath, "templates", "appPackage", "manifest.local.template.json"),
        { overwrite: true }
      );
      await fs.remove(localManifestFile);
      moveFiles += "manifest.local.template.json,";
      removeMap.set(
        path.join(backupPath, "templates", "appPackage", "manifest.local.template.json"),
        localManifestFile
      );
    }
    if (await fs.pathExists(remoteManifestFile)) {
      await fs.copy(
        remoteManifestFile,
        path.join(backupPath, "templates", "appPackage", "manifest.remote.template.json"),
        { overwrite: true }
      );
      await fs.remove(remoteManifestFile);
      moveFiles += "manifest.remote.template.json,";
      removeMap.set(
        path.join(backupPath, "templates", "appPackage", "manifest.remote.template.json"),
        remoteManifestFile
      );
    }

    if (needMigrateAadManifest) {
      await generateAadManifest(inputs.projectPath!, projectSettings);
      const aadManifestPath = path.join(
        inputs.projectPath as string,
        "templates",
        "appPackage",
        "aad.template.json"
      );
      fileList.push(aadManifestPath);
      await fs.writeJSON(projectSettingsPath, projectSettings, { spaces: 4, EOL: os.EOL });

      moveFiles += "projectSettings.json,";
      await fs.ensureDir(path.join(backupPath, ".fx", "configs"));
      await fs.writeJSON(
        path.join(backupPath, ".fx", "configs", "projectSettings.json"),
        projectSettings,
        { spaces: 4, EOL: os.EOL }
      );
      removeMap.set(
        path.join(backupPath, ".fx", "configs", "projectSettings.json"),
        projectSettingsPath
      );
    }

    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateBackupConfig, {
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });
    sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateUpgrade, {
      [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
    });

    postConsolidate(inputs.projectPath as string, ctx, inputs, backupFolder, moveFiles);
  } catch (e) {
    for (const item of removeMap.entries()) {
      await fs.copy(item[0], item[1]);
    }
    for (const item of fileList) {
      await fs.remove(item);
    }
    await fs.remove(path.join(inputs.projectPath as string, backupFolder));
    throw e;
  }

  generateUpgradeReport(path.join(inputs.projectPath as string, backupFolder));
  return true;
}

function checkMethod(ctx: CoreHookContext): boolean {
  if (ctx.method && methods.has(ctx.method) && userCancelFlag) return false;
  userCancelFlag = ctx.method != undefined && methods.has(ctx.method);
  return true;
}

async function postConsolidate(
  projectPath: string,
  ctx: CoreHookContext,
  inputs: Inputs,
  backupFolder: string | undefined,
  moveFiles: string
): Promise<void> {
  sendTelemetryEvent(Component.core, TelemetryEvent.ProjectConsolidateGuideStart, {
    [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
  });
  await updateGitIgnore(projectPath, TOOLS.logProvider, backupFolder);

  if (moveFiles.length > 0) {
    moveFiles = moveFiles.substring(0, moveFiles.length - 1);
    TOOLS?.logProvider.warning(
      `[core] Upgrade success! Old ${moveFiles} have been backed up to the .backup folder and you can delete it.`
    );
  }

  if (inputs.platform !== Platform.VSCode) {
    const msg = needMigrateAadManifest
      ? getLocalizedString("core.consolidateLocalRemoteWithAadManifest.SuccessMessage")
      : getLocalizedString("core.consolidateLocalRemote.SuccessMessage");
    TOOLS?.logProvider.info(msg);
  }
}

async function updateGitIgnore(
  projectPath: string,
  log: LogProvider,
  backupFolder: string | undefined
): Promise<void> {
  // add config.local.json to .gitignore
  await addPathToGitignore(
    projectPath,
    `${projectPath}/.${ConfigFolderName}/${InputConfigsFolderName}/config.local.json`,
    log
  );

  // add state.local.json to .gitignore
  await addPathToGitignore(
    projectPath,
    `${projectPath}/.${ConfigFolderName}/${StatesFolderName}/state.local.json`,
    log
  );

  if (backupFolder) {
    await addPathToGitignore(projectPath, `${projectPath}/${backupFolder}`, log);
  }
}

async function generateUpgradeReport(backupFolder: string) {
  try {
    const reportName = upgradeWithAadManifestReportName;
    const target = path.join(backupFolder, reportName);
    const source = path.resolve(path.join(getResourceFolder(), reportName));
    await fs.copyFile(source, target);
  } catch (error) {
    // do nothing
  }
}

function replaceSPFxComponentId(content: string): string {
  const match = componentIdRegex.exec(content);
  if (match) {
    return match[0];
  }
  return "";
}

async function compareLocalAndRemoteManifest(
  localManifestFile: string,
  remoteManifestFile: string
) {
  try {
    const localManifestString = (await fs.readFile(localManifestFile))
      .toString()
      .replace(manifestRegex, "");
    const remoteManifestString = (await fs.readFile(remoteManifestFile))
      .toString()
      .replace(manifestRegex, "");
    const localManifestJson = JSON.parse(localManifestString);
    const remoteManifestJson = JSON.parse(remoteManifestString);
    if (!diff(localManifestJson, remoteManifestJson)) {
      notifyToUpdateManifest();
    }
  } catch (error) {
    sendTelemetryErrorEvent(
      Component.core,
      TelemetryEvent.ProjectConsolidateCheckManifestError,
      assembleError(error, CoreSource),
      {
        [TelemetryProperty.NeedMigrateAadManifest]: needMigrateAadManifest ? "true" : "false",
      }
    );
  }
}

async function notifyToUpdateManifest() {
  const res = await TOOLS?.ui.showMessage(
    "warn",
    getLocalizedString("core.consolidateLocalRemote.DifferentManifest"),
    false,
    "OK",
    LearnMore
  );
  const answer = res?.isOk() ? res.value : undefined;
  if (answer === LearnMore) {
    TOOLS?.ui.openUrl(UnifyManifestLearMoreLink);
  }
}

function diff(a: any, b: any): boolean {
  const keys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (keys.length != bKeys.length) {
    return false;
  }
  let aValue, bValue, key;
  for (key of keys) {
    if (ignoreKeys.has(key)) {
      continue;
    }
    aValue = a[key];
    bValue = b[key];
    if (isObject(aValue) && isObject(bValue)) {
      if (!diff(aValue, bValue)) {
        return false;
      }
    } else {
      if (aValue !== bValue) {
        return false;
      }
    }
  }
  return true;
}

function isObject(o: any): boolean {
  return typeof o === "object" && !!o;
}
