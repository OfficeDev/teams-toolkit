// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ConfigFolderName,
  InputConfigsFolderName,
  Json,
  ProjectSettings,
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import * as path from "path";

import { readJson } from "../fileUtils";
import { LocalSettingsProvider } from "../localSettingsProvider";
import { waitSeconds } from "../tools";
import { LocalCrypto } from "../../core/crypto";

class LocalEnvManager {
  public async getLaunchInput() {}

  public async getLocalDebugEnvs() {}

  public async getNpmInstallLogInfo() {}

  public async getPortsInUse() {}

  public async getProgrammingLanguage() {}

  public async getSkipNgrokConfig() {}

  private async getLocalSettings(projectPath: string): Promise<Json | undefined> {
    const projectSettings = await this.getProjectSettings(projectPath);
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    const crypto = new LocalCrypto(projectSettings.projectId);
    return await this.retry(async () => {
      return await localSettingsProvider.loadV2(crypto);
    });
  }

  private async getProjectSettings(projectPath: string): Promise<ProjectSettings> {
    return await this.retry(async () => {
      return await readJson(
        path.resolve(
          projectPath,
          `.${ConfigFolderName}`,
          InputConfigsFolderName,
          ProjectSettingsFileName
        )
      );
    });
  }

  // Retry logic when reading project config files in case of read-write conflict
  private async retry<T>(func: (iteration: number) => Promise<T>): Promise<T> {
    let n = 0;
    let error = undefined;
    while (n <= 2) {
      if (n !== 0) {
        await waitSeconds(n);
      }

      try {
        return await func(n);
      } catch (e) {
        error = e;
        ++n;
      }
    }
    throw error;
  }
}

export const localEnvManager = new LocalEnvManager();
