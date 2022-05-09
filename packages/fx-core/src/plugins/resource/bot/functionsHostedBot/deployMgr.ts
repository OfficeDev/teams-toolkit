// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import ignore, { Ignore } from "ignore";
import { forEachFileAndDir } from "../utils/dir-walk";
import { DeployConfigs, FolderNames } from "../constants";
import { Logger } from "../logger";
import {
  AzureOperationCommonConstants,
  DeployConfigsConstants,
} from "../../../../common/azure-hosting/hostingConstant";

export class FuncHostedDeployMgr {
  private readonly workingDir: string;
  private readonly deploymentDir: string;
  private readonly deploymentInfoFile: string;
  private readonly deploymentZipCacheFile: string;
  private readonly envName: string;

  public constructor(workingDir: string, envName: string) {
    this.workingDir = workingDir;
    this.deploymentDir = path.join(workingDir, DeployConfigs.DEPLOYMENT_FOLDER);
    this.deploymentInfoFile = path.join(
      this.deploymentDir,
      DeployConfigsConstants.DEPLOYMENT_INFO_FILE
    );
    this.deploymentZipCacheFile = path.join(
      this.deploymentDir,
      DeployConfigsConstants.DEPLOYMENT_ZIP_CACHE_FILE
    );
    this.envName = envName;
  }

  public async getLastDeployTime(): Promise<Date> {
    try {
      const lastDeployJson = await fs.readJSON(this.deploymentInfoFile);
      return new Date(lastDeployJson[this.envName].time);
    } catch (err) {
      Logger.debug(`readJson ${this.deploymentInfoFile} failed with error: ${err}.`);
      throw err;
    }
  }

  public async needsToRedeploy(): Promise<boolean> {
    try {
      const lastDeployTime = await this.getLastDeployTime();
      // Always ignore node_modules folder and bin folder and the file ignored both by git and func.
      const defaultIgnore = await FuncHostedDeployMgr.prepareIgnore([FolderNames.NODE_MODULES]);
      const funcIgnoreRules = await this.getIgnoreRules(DeployConfigsConstants.FUNC_IGNORE_FILE);
      const funcIgnore = await FuncHostedDeployMgr.prepareIgnore(funcIgnoreRules);
      const gitIgnoreRules = await this.getIgnoreRules(DeployConfigsConstants.GIT_IGNORE_FILE);
      const gitIgnore = await FuncHostedDeployMgr.prepareIgnore(gitIgnoreRules);

      let changed = false;
      await forEachFileAndDir(
        this.workingDir,
        (itemPath: string, stats: fs.Stats) => {
          // Don't check the modification time of .deployment folder.
          const relativePath = path.relative(this.workingDir, itemPath);

          if (
            relativePath &&
            !defaultIgnore.test(relativePath).ignored &&
            !(funcIgnore.test(relativePath).ignored && gitIgnore.test(relativePath).ignored) &&
            lastDeployTime < stats.mtime
          ) {
            changed = true;
            // Return true to stop walking.
            return true;
          }
        },
        (itemPath: string) => path.basename(itemPath) !== FolderNames.NODE_MODULES
      );
      return changed;
    } catch (e) {
      // Failed to check updated, but it doesn't block the deployment.
      return true;
    }
  }

  public async saveDeploymentInfo(zipContent: Buffer, deployTime: Date): Promise<void> {
    await fs.ensureDir(this.deploymentDir);
    let lastDeployJson: any = {};
    try {
      lastDeployJson = await fs.readJSON(this.deploymentInfoFile);
    } catch {
      // It's fine if failed to read json from the deployment file.
    }

    lastDeployJson[this.envName] ??= {};
    lastDeployJson[this.envName].time = deployTime;

    try {
      await fs.writeJSON(this.deploymentInfoFile, lastDeployJson);
      await fs.writeFile(this.deploymentZipCacheFile, zipContent);
    } catch {
      // Deploy still succeeded even we failed to record it.
    }
  }

  private async loadLastDeploymentZipCache(): Promise<AdmZip | undefined> {
    try {
      const content = await fs.readFile(this.deploymentZipCacheFile);
      return new AdmZip(content);
    } catch {
      // Failed to load cache, it doesn't block deployment.
    }
    return undefined;
  }

  private removeLegacyFileInZip(zip: AdmZip, existenceFiles: Set<string>): void {
    zip
      .getEntries()
      .filter((entry) => !existenceFiles.has(entry.name))
      .forEach((entry) => {
        zip.deleteFile(entry.name);
      });
  }

  public async zipAFolder(rules: string[]): Promise<Buffer> {
    // The granularity of time store in zip is 2-seconds.
    // To compare it with mtime in fs.Stats, we need to normalize them into same granularity.
    const normalizeTime = (t: number) =>
      Math.floor(t / AzureOperationCommonConstants.zipTimeMSGranularity);

    const zip = (await this.loadLastDeploymentZipCache()) || new AdmZip();
    const ig = await FuncHostedDeployMgr.prepareIgnore(rules);
    const tasks: Promise<void>[] = [];
    const zipFiles = new Set<string>();

    const addFileIntoZip = async (
      zip: AdmZip,
      filePath: string,
      zipPath: string,
      stats?: fs.Stats
    ) => {
      const content = await fs.readFile(filePath);
      zip.addFile(zipPath, content);
      if (stats) {
        (zip.getEntry(zipPath)!.header as any).time = stats.mtime;
      }
    };

    await forEachFileAndDir(this.workingDir, (itemPath: string, stats: fs.Stats) => {
      const relativePath: string = path.relative(this.workingDir, itemPath);
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
        const fullPath = path.join(this.workingDir, relativePath);
        const task = addFileIntoZip(zip, fullPath, relativePath, stats);
        tasks.push(task);
      }
    });

    await Promise.all(tasks);
    this.removeLegacyFileInZip(zip, zipFiles);

    return zip.toBuffer();
  }

  private static async prepareIgnore(rules: string[]): Promise<Ignore> {
    const ig = ignore().add(DeployConfigs.DEPLOYMENT_FOLDER);
    for (const rule of rules) {
      ig.add(rule);
    }

    return ig;
  }

  public async getIgnoreRules(fileName: string): Promise<string[]> {
    let result: string[] = [];
    const ignoreFilePath = path.join(this.workingDir, fileName);
    if (await fs.pathExists(ignoreFilePath)) {
      const ignoreFileContent = await fs.readFile(ignoreFilePath);
      result = ignoreFileContent
        .toString()
        .split("\n")
        .map((line) => line.trim());
    }

    return result;
  }
}
