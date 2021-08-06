// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

import { ConfigFolderName } from "@microsoft/teamsfx-api";

const cliLogFolderName = "cli-log";
const localPreviewLogFolderName = "local-preview";
const localPreviewLogFolder = path.join(
  os.homedir(),
  `.${ConfigFolderName}`,
  cliLogFolderName,
  localPreviewLogFolderName
);
const maxlocalPreviewLogNumber = 10;

// TODO: may refactor when CLI framework provides file logger
export class ServiceLogWriter {
  private readonly logFolder: string;

  constructor() {
    const datetime = new Date();
    this.logFolder = path.join(
      localPreviewLogFolder,
      datetime.toISOString().replace(/:/g, "_").replace(/\./g, "_")
    );
  }

  public async init(): Promise<void> {
    try {
      await this.clean();
      await fs.ensureDir(this.logFolder);
    } catch (error) {
      // ignore any error
    }
  }

  public async write(serviceTitle: string, data: string): Promise<void> {
    try {
      const logFile = path.join(this.logFolder, `${serviceTitle.split(" ").join("-")}.log`);
      await fs.ensureFile(logFile);
      await fs.appendFile(logFile, data);
    } catch (error) {
      // ignore any error
    }
  }

  public async getLogFile(serviceTitle: string): Promise<string | undefined> {
    const logFile = path.join(this.logFolder, `${serviceTitle.split(" ").join("-")}.log`);
    try {
      const existing = await fs.pathExists(logFile);
      return existing ? logFile : undefined;
    } catch (error) {
      // ignore any error
      return undefined;
    }
  }

  private async clean(): Promise<void> {
    try {
      let folders = await fs.readdir(localPreviewLogFolder);
      if (folders.length >= maxlocalPreviewLogNumber) {
        folders = folders.sort();
        for (let i = 0; i + maxlocalPreviewLogNumber <= folders.length; ++i) {
          await fs.remove(path.join(localPreviewLogFolder, folders[i]));
        }
      }
    } catch (error) {
      // ignore any error
    }
  }
}
