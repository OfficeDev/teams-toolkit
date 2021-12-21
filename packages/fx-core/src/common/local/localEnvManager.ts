// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ConfigFolderName,
  InputConfigsFolderName,
  Json,
  ProjectSettings,
  ProjectSettingsFileName,
  UserError,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";

import { LocalSettingsProvider } from "../localSettingsProvider";
import { waitSeconds } from "../tools";
import { LocalCrypto } from "../../core/crypto";
import { CoreSource, ReadFileError } from "../../core/error";

class LocalEnvManager {
  public getLaunchInput(rawLocalSettings: Json | undefined): any {
    // return local teams app id
    const localTeamsAppId = rawLocalSettings?.teamsApp?.teamsAppId as string;
    return { appId: localTeamsAppId };
  }

  public async getLocalDebugEnvs() {}

  public async getNpmInstallLogInfo() {}

  public async getPortsInUse() {}

  public getProgrammingLanguage(projectSettings: ProjectSettings): string | undefined {
    return projectSettings.programmingLanguage;
  }

  public getSkipNgrokConfig(rawLocalSettings: Json | undefined): boolean {
    return (rawLocalSettings?.bot?.skipNgrok as boolean) === true;
  }

  public async getLocalSettings(projectPath: string, projectId: string): Promise<Json | undefined> {
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    const crypto = new LocalCrypto(projectId);
    return await this.retry(async () => {
      return await localSettingsProvider.loadV2(crypto);
    });
  }

  // Load local settings without encryption
  public async getRawLocalSettings(projectPath: string): Promise<Json | undefined> {
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    return await this.retry(async () => {
      return await localSettingsProvider.loadV2(undefined);
    });
  }

  public async getProjectSettings(projectPath: string): Promise<ProjectSettings> {
    return await this.retry(async () => {
      const projectSettingsPath = path.resolve(
        projectPath,
        `.${ConfigFolderName}`,
        InputConfigsFolderName,
        ProjectSettingsFileName
      );

      if (!(await fs.pathExists(projectSettingsPath))) {
        throw new UserError(
          "FileNotFoundError",
          `Project settings file does not exist: ${projectSettingsPath}`,
          CoreSource
        );
      }

      try {
        return await fs.readJson(projectSettingsPath);
      } catch (error: any) {
        throw ReadFileError(error);
      }
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
