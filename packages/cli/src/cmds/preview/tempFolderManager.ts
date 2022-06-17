// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";

export class TempFolderManager {
  private basePath: string;
  private maxFolderNumber: number;

  constructor(basePath: string, maxFolderNumber: number) {
    this.basePath = basePath;
    this.maxFolderNumber = maxFolderNumber;
  }

  public async getTempFolderPath(): Promise<string | undefined> {
    try {
      await this.clean();

      const datetime = new Date();
      const folderPath = path.join(
        this.basePath,
        datetime.toISOString().replace(/:/g, "_").replace(/\./g, "_")
      );
      await fs.ensureDir(folderPath);
      return folderPath;
    } catch {
      // ignore any error
      return undefined;
    }
  }

  public async clean(): Promise<void> {
    try {
      let folders = await fs.readdir(this.basePath);
      if (folders.length >= this.maxFolderNumber) {
        folders = folders.sort();
        for (let i = 0; i + this.maxFolderNumber <= folders.length; ++i) {
          await fs.remove(path.join(this.basePath, folders[i]));
        }
      }
    } catch {
      // ignore any error
    }
  }
}
