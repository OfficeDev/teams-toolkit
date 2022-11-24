// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs } from "@microsoft/teamsfx-api";
import fs, { CopyOptions, EnsureOptions, PathLike, WriteFileOptions } from "fs-extra";
import path from "path";
import { CoreHookContext } from "../../types";

const teamsfxFolder = "teamsfx";
const backupFolder = "backup";
export const V2TeamsfxFolder = ".fx";
export interface MigrationContext extends CoreHookContext {
  backup(path: string): Promise<boolean>;
  fsEnsureDir(path: string, options?: EnsureOptions | number): Promise<void>;
  fsCopy(src: string, dest: string, options?: CopyOptions): Promise<void>;
  fsCreateFile(file: string): Promise<void>;
  fsWriteFile(
    file: PathLike | number,
    data: any,
    options?: WriteFileOptions | string
  ): Promise<void>;
  addReport(report: string): void;
  addTelemetryProperties(properties: { [key: string]: string }): void;
}

export class MigrationContext {
  private modifiedPaths: string[] = [];
  backupPath = "";
  projectPath = "";

  static async create(ctx: CoreHookContext): Promise<MigrationContext> {
    const context = new MigrationContext(ctx);
    await fs.ensureDir(context.backupPath);
    return context;
  }

  private constructor(ctx: CoreHookContext) {
    Object.assign(this, ctx, {});
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    this.projectPath = inputs.projectPath as string;
    this.backupPath = path.join(this.projectPath, teamsfxFolder, backupFolder);
  }

  async backup(_path: string): Promise<boolean> {
    const srcPath = path.join(this.projectPath, _path);
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, path.join(this.backupPath, _path));
      return true;
    }
    return false;
  }

  async fsEnsureDir(_path: string, options?: EnsureOptions | number): Promise<void> {
    const srcPath = path.join(this.projectPath, _path);
    const parentPath = path.dirname(srcPath);
    if (!(await fs.pathExists(parentPath))) {
      await this.fsEnsureDir(path.relative(this.projectPath, parentPath), options);
    }
    if (!(await fs.pathExists(srcPath))) {
      await fs.ensureDir(srcPath, options);
      this.addModifiedPath(_path);
    }
  }

  async fsCopy(src: string, dest: string, options?: CopyOptions): Promise<void> {
    await fs.copy(path.join(this.projectPath, src), path.join(this.projectPath, dest), options);
    this.addModifiedPath(dest);
  }

  async fsCreateFile(file: string): Promise<void> {
    await fs.createFile(path.join(this.projectPath, file));
    this.addModifiedPath(file);
  }

  async fsWriteFile(file: string, data: any, options?: WriteFileOptions | string): Promise<void> {
    await fs.writeFile(path.join(this.projectPath, file), data, options);
    this.addModifiedPath(file);
  }

  addModifiedPath(path: string) {
    if (!this.modifiedPaths.includes(path)) {
      this.modifiedPaths.push(path);
    }
  }

  getModifiedPaths(): string[] {
    return this.modifiedPaths.slice();
  }
}

export async function wrapRunMigration(
  context: MigrationContext,
  exec: (context: MigrationContext) => void
): Promise<void> {
  try {
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationStart);
    await exec(context);
    await showSummaryReport(context);
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationEnd);
  } catch (error: any) {
    // sendTelemetryEvent("core", TelemetryEvent.ProjectMigratorNotificationFailed);
    await rollbackMigration(context);
    throw error;
  }
}

async function rollbackMigration(context: MigrationContext): Promise<void> {}

async function showSummaryReport(context: MigrationContext): Promise<void> {}
