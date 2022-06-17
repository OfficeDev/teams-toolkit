// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Base64 } from "js-base64";
import { Uuid } from "node-ts-uuid";
import { exec } from "child_process";
import { default as urlParse } from "url-parse";
import AdmZip from "adm-zip";

import { ConfigValue, PluginContext } from "@microsoft/teamsfx-api";
import { RegularExprs, WebAppConstants } from "../constants";
import { ProgrammingLanguage } from "../enums/programmingLanguage";
import * as appService from "@azure/arm-appservice";
import { PluginBot } from "../resources/strings";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import ignore, { Ignore } from "ignore";
import * as fs from "fs-extra";
import { forEachFileAndDir } from "./dir-walk";
import path from "path";
import { AzureOperationCommonConstants } from "../../../../common/azure-hosting/hostingConstant";

export function toBase64(source: string): string {
  return Base64.encode(source);
}

export function genUUID(): string {
  return Uuid.generate();
}

export function zipAFolder(
  sourceDir: string,
  notIncluded?: string[],
  mustIncluded?: string[]
): Buffer {
  const zip = buildZip(sourceDir, notIncluded, mustIncluded);
  return zip.toBuffer();
}

/**
 * Asynchronously zip a folder and return buffer
 * @param sourceDir base dir
 * @param notIncluded block list
 * @param cache zip cache file location
 */
export async function zipFolderAsync(
  sourceDir: string,
  cache: string,
  notIncluded?: Ignore
): Promise<Buffer> {
  const normalizeTime = (t: number) =>
    Math.floor(t / AzureOperationCommonConstants.zipTimeMSGranularity);

  const tasks: Promise<void>[] = [];
  const zipFiles = new Set<string>();
  const ig = notIncluded ?? ignore();
  const zip = (await readZipFromCache(cache)) || new AdmZip();

  const addFileIntoZip = async (
    zp: AdmZip,
    filePath: string,
    zipPath: string,
    stats?: fs.Stats
  ) => {
    const content = await fs.readFile(filePath);
    zp.addFile(zipPath, content);
    if (stats) {
      (zp.getEntry(zipPath)!.header as any).time = stats.mtime;
    }
  };

  await forEachFileAndDir(sourceDir, (itemPath: string, stats: fs.Stats) => {
    const relativePath: string = path.relative(sourceDir, itemPath);
    if (relativePath && !stats.isDirectory() && ig.filter([relativePath]).length > 0) {
      zipFiles.add(relativePath);

      const entry = zip.getEntry(relativePath);
      if (entry) {
        // The header is an object, the ts declare of adm-zip is wrong.
        const header = entry.header as any;
        const mtime = header && header.time;
        // Some files' mtime in node_modules are too old, which may be invalid,
        // so we arbitrarily add a limitation to update this kind of files.
        // If mtime is valid and the two mtime is same in two-seconds, we think the two are same file.
        if (
          mtime >= AzureOperationCommonConstants.latestTrustMtime &&
          normalizeTime(mtime.getTime()) === normalizeTime(stats.mtime.getTime())
        ) {
          return;
        }

        // Delete the entry because the file has been updated.
        zip.deleteFile(relativePath);
      }

      // If fail to reuse cached entry, load it from disk.
      const fullPath = path.join(sourceDir, relativePath);
      const task = addFileIntoZip(zip, fullPath, relativePath, stats);
      tasks.push(task);
    }
  });

  await Promise.all(tasks);
  removeLegacyFileInZip(zip, zipFiles);

  return zip.toBuffer();
}

async function readZipFromCache(cache: string): Promise<AdmZip | undefined> {
  try {
    const content = await fs.readFile(cache);
    return new AdmZip(content);
  } catch {
    // Failed to load cache, it doesn't block deployment.
  }
  return undefined;
}

function removeLegacyFileInZip(zip: AdmZip, existenceFiles: Set<string>): void {
  zip
    .getEntries()
    .filter((entry) => !existenceFiles.has(entry.name))
    .forEach((entry) => {
      zip.deleteFile(entry.name);
    });
}

function buildZip(sourceDir: string, notIncluded?: string[], mustIncluded?: string[]): AdmZip {
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir, "", (filename: string) => {
    if (mustIncluded) {
      const hit = mustIncluded.find((mustItem) => {
        return filename.startsWith(mustItem);
      });

      if (hit) {
        return true;
      }
    }

    if (notIncluded) {
      const hit = notIncluded.find((notIncludedItem) => {
        return filename.startsWith(notIncludedItem);
      });

      return !hit;
    }

    return true;
  });
  return zip;
}

export function isValidWebAppSiteName(name: string): boolean {
  return RegularExprs.WEB_APP_SITE_NAME.test(name);
}

export function isValidAppServicePlanName(name: string): boolean {
  return RegularExprs.APP_SERVICE_PLAN_NAME.test(name);
}

export function isValidBotChannelRegName(name: string): boolean {
  return RegularExprs.BOT_CHANNEL_REG_NAME.test(name);
}

export function isDomainValidForAzureWebApp(url: string): boolean {
  return urlParse(url).hostname.endsWith(WebAppConstants.WEB_APP_SITE_DOMAIN);
}

export async function execute(command: string, workingDir?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!workingDir) {
      workingDir = __dirname;
    }
    exec(command, { cwd: workingDir }, (error, standardOutput) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(standardOutput);
    });
  });
}

export function checkAndSaveConfig(context: PluginContext, key: string, value: ConfigValue): void {
  if (!value) {
    return;
  }

  context.config.set(key, value);
}

export function checkAndSavePluginSetting(
  context: PluginContext,
  key: string,
  value: ConfigValue
): void {
  if (!value || !context.projectSettings) {
    return;
  }

  if (!context.projectSettings.pluginSettings) {
    context.projectSettings.pluginSettings = {};
  }

  if (!context.projectSettings.pluginSettings[PluginBot.PLUGIN_NAME]) {
    context.projectSettings.pluginSettings[PluginBot.PLUGIN_NAME] = {};
  }
  context.projectSettings.pluginSettings[PluginBot.PLUGIN_NAME][key] = value;
}

export function checkAndSavePluginSettingV2(
  context: Context,
  key: string,
  value: ConfigValue
): void {
  if (!value || !context.projectSetting) {
    return;
  }

  if (!context.projectSetting.pluginSettings) {
    context.projectSetting.pluginSettings = {};
  }

  if (!context.projectSetting.pluginSettings[PluginBot.PLUGIN_NAME]) {
    context.projectSetting.pluginSettings[PluginBot.PLUGIN_NAME] = {};
  }
  context.projectSetting.pluginSettings[PluginBot.PLUGIN_NAME][key] = value;
}

export function existsInEnumValues<T extends string>(
  value: string,
  targetEnum: { [key: string]: T }
): value is T {
  return Object.values(targetEnum).find((itemValue: string) => value === itemValue) !== undefined;
}

export function convertToConstValues<V extends string, T extends { [key in string]: V }>(
  value: unknown,
  targetValues: T
): V | undefined {
  return Object.values(targetValues).find((itemValue) => value === itemValue);
}

export function isHttpCodeOkOrCreated(code: number): boolean {
  return [200, 201].includes(code);
}

export function isHttpCodeAccepted(code: number): boolean {
  return code === 202;
}

export function convertToLangKey(programmingLanguage: ProgrammingLanguage): string {
  switch (programmingLanguage) {
    case ProgrammingLanguage.JavaScript: {
      return "js";
    }
    case ProgrammingLanguage.TypeScript: {
      return "ts";
    }
    default: {
      return "js";
    }
  }
}

export function convertToTelemetryName(raw: string): string {
  return raw.toLowerCase().replace(/ /g, "-");
}

export function generateAppServicePlanConfig(
  location: string,
  skuName: string
): appService.WebSiteManagementModels.AppServicePlan {
  return {
    location: location,
    kind: "app",
    sku: {
      name: skuName,
    },
  };
}
