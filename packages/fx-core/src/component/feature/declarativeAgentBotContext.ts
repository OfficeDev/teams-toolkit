// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs, { CopyOptions, WriteFileOptions } from "fs-extra";
import path from "path";

import { M365TokenProvider } from "@microsoft/teamsfx-api";

export const backupFolder = ".backup";

export class DeclarativeAgentBotContext {
  private modifiedPaths: string[] = [];
  env = "";
  projectPath = "";
  backupPath = "";
  declarativeAgentManifestPath = "";
  tokenProvider: M365TokenProvider | undefined = undefined;
  declarativeAgentId?: string;
  teamsBotId?: string;

  static async create(
    env: string,
    projectPath: string,
    declarativeAgentManifestPath: string,
    tokenProvider: M365TokenProvider
  ): Promise<DeclarativeAgentBotContext> {
    const context = new DeclarativeAgentBotContext(
      env,
      projectPath,
      declarativeAgentManifestPath,
      tokenProvider
    );
    await fs.ensureDir(context.backupPath);
    return context;
  }

  private constructor(
    env: string,
    projectPath: string,
    declarativeAgentManifestPath: string,
    tokenProvider: M365TokenProvider
  ) {
    this.env = env;
    this.projectPath = projectPath;
    this.declarativeAgentManifestPath = declarativeAgentManifestPath;
    this.tokenProvider = tokenProvider;
    this.backupPath = path.join(this.projectPath, backupFolder);
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

  async fsWriteFile(file: string, data: any, options?: WriteFileOptions | string): Promise<void> {
    await fs.writeFile(path.join(this.projectPath, file), data, options);
    this.addModifiedPath(file);
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
