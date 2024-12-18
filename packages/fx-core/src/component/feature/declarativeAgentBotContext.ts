// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs, { CopyOptions, WriteFileOptions } from "fs-extra";
import path from "path";

import { envUtil } from "../utils/envUtil";
import { pathUtils } from "../utils/pathUtils";
import { Platform } from "@microsoft/teamsfx-api";

export const backupFolder = ".backup";

export class DeclarativeAgentBotContext {
  private modifiedPaths: string[] = [];
  platform: Platform;
  env = "";
  projectPath = "";
  backupPath = "";
  agentManifestPath = "";
  agentId?: string;
  teamsBotId?: string;
  multiTenant = false;

  static async create(
    platform: Platform,
    env: string,
    projectPath: string,
    declarativeAgentManifestPath: string,
    multiTenant: boolean
  ): Promise<DeclarativeAgentBotContext> {
    const context = new DeclarativeAgentBotContext(
      platform,
      env,
      projectPath,
      declarativeAgentManifestPath,
      multiTenant
    );
    await fs.ensureDir(context.backupPath);
    return context;
  }

  private constructor(
    platform: Platform,
    env: string,
    projectPath: string,
    declarativeAgentManifestPath: string,
    multiTenant: boolean
  ) {
    this.platform = platform;
    this.env = env;
    this.projectPath = projectPath;
    this.agentManifestPath = declarativeAgentManifestPath;
    this.backupPath = path.join(this.projectPath, backupFolder);
    this.multiTenant = multiTenant;
  }

  async backup(_path: string): Promise<boolean> {
    const srcPath = path.join(this.projectPath, _path);
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, path.join(this.projectPath, backupFolder, _path));
      return true;
    }
    return false;
  }

  addModifiedPath(path: string): void {
    if (!this.modifiedPaths.includes(path)) {
      this.modifiedPaths.push(path);
    }
  }

  async cleanModifiedPaths(): Promise<void> {
    for (const modifiedPath of this.modifiedPaths.reverse()) {
      await this.fsRemove(modifiedPath);
    }
    this.modifiedPaths.length = 0;
  }

  async fsCopy(src: string, dest: string, options?: CopyOptions): Promise<void> {
    await fs.copy(path.join(this.projectPath, src), path.join(this.projectPath, dest), options);
    this.addModifiedPath(dest);
  }

  async fsRemove(_path: string): Promise<void> {
    return await fs.remove(path.join(this.projectPath, _path));
  }

  async fsWriteFile(
    file: string,
    data: unknown,
    options?: WriteFileOptions | string
  ): Promise<void> {
    await fs.writeFile(path.join(this.projectPath, file), data, options);
    this.addModifiedPath(file);
  }

  async writeEnv(key: string, value: string): Promise<void> {
    const envFilePath = await pathUtils.getEnvFilePath(this.projectPath, this.env);
    if (envFilePath.isErr()) throw envFilePath.error;
    if (!envFilePath.value) throw new Error("Env file not found");

    await this.backup(envFilePath.value);
    await envUtil.writeEnv(this.projectPath, this.env, { [key]: value });
    this.addModifiedPath(envFilePath.value);
  }

  async cleanBackup(): Promise<void> {
    await this.fsRemove(backupFolder);
  }

  async restoreBackup(): Promise<void> {
    const paths = await fs.readdir(this.backupPath);
    await Promise.all(
      paths.map(async (_path) => {
        await fs.copy(path.join(this.backupPath, _path), path.join(this.projectPath, _path));
      })
    );
  }
}
