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
  backup(backupFolder: string): Promise<void>;
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
  constructor(ctx: CoreHookContext) {
    Object.assign(this, ctx, {});
    const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
    this.projectPath = inputs.projectPath as string;
    this.backupPath = path.join(this.projectPath, teamsfxFolder, backupFolder);
  }

  // backupFolder is a relative path
  async backup(backupFolder: string): Promise<void> {}

  async fsEnsureDir(path: string, options?: EnsureOptions | number): Promise<void> {
    // TODO: add created path into modifiedPaths
    return await fs.ensureDir(path, options);
  }

  async fsCopy(src: string, dest: string, options?: CopyOptions): Promise<void> {
    // TODO: add dest into modifiedPaths
    return await fs.copy(src, dest, options);
  }

  async fsCreateFile(file: string): Promise<void> {
    // TODO: add file into modifiedPaths
    return await fs.createFile(file);
  }

  async fsWriteFile(
    file: PathLike | number,
    data: any,
    options?: WriteFileOptions | string
  ): Promise<void> {
    // TODO: add file into modifiedPaths
    return await fs.writeFile(file, data, options);
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
