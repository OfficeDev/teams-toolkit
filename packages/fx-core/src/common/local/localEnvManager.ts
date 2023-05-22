// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  Json,
  LogProvider,
  ProjectSettings,
  TelemetryReporter,
  UserInteraction,
  v2,
} from "@microsoft/teamsfx-api";
import * as commentJson from "comment-json";
import * as fs from "fs-extra";
import * as path from "path";

import * as localStateHelper from "./localStateHelper";
import { LocalSettingsProvider } from "../localSettingsProvider";
import { getNpmInstallLogInfo, NpmInstallLogInfo } from "./npmLogHelper";
import { getPortsInUse, getPortsFromProject } from "./portChecker";
import { waitSeconds } from "../tools";
import { LocalCrypto } from "../../core/crypto";
import { CoreSource, ReadFileError } from "../../core/error";
import { LocalStateProvider } from "../localStateProvider";
import {
  getProjectSettingsPath,
  loadProjectSettingsByProjectPath,
} from "../../core/middleware/projectSettingsLoader";
import { convertEnvStateV3ToV2 } from "../../component/migrate";
import { FileNotFoundError } from "../../error/common";

export class LocalEnvManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetry: TelemetryReporter | undefined;
  private readonly ui: UserInteraction | undefined;

  constructor(logger?: LogProvider, telemetry?: TelemetryReporter, ui?: UserInteraction) {
    this.logger = logger;
    this.telemetry = telemetry;
    this.ui = ui;
  }

  public async getLocalDebugEnvs(
    projectPath: string,
    projectSettings: ProjectSettings,
    localSettings: Json | undefined,
    envInfo?: v2.EnvInfoV2
  ): Promise<Record<string, string>> {
    return await localStateHelper.convertToLocalEnvs(
      projectPath,
      projectSettings,
      envInfo,
      this.logger
    );
  }

  public async getNpmInstallLogInfo(): Promise<NpmInstallLogInfo | undefined> {
    return await getNpmInstallLogInfo();
  }

  public async getPortsFromProject(
    projectPath: string,
    projectSettings: ProjectSettings
  ): Promise<number[]> {
    return await getPortsFromProject(projectPath, projectSettings, false);
  }

  public async getPortsInUse(ports: number[]): Promise<number[]> {
    return await getPortsInUse(ports, this.logger);
  }

  public async getLocalSettings(
    projectPath: string,
    cryptoOption?: { projectId: string }
  ): Promise<Json | undefined> {
    const localSettingsProvider = new LocalSettingsProvider(projectPath);
    const crypto = cryptoOption === undefined ? undefined : new LocalCrypto(cryptoOption.projectId);
    return await this.retry(async () => {
      return await localSettingsProvider.loadV2(crypto);
    });
  }

  public async getLocalEnvInfo(
    projectPath: string,
    cryptoOption: { projectId: string }
  ): Promise<v2.EnvInfoV2 | undefined> {
    const localStateProvider = new LocalStateProvider(projectPath);
    const crypto = new LocalCrypto(cryptoOption.projectId);
    return await this.retry(async () => {
      const envInfo = await localStateProvider.loadV2(crypto);
      if (envInfo) {
        // for v3, this envInfo is exported to outside of fx-core, we need to revert it into old pattern
        envInfo.state = convertEnvStateV3ToV2(envInfo.state);
      }
      return envInfo;
    });
  }

  public async getProjectSettings(projectPath: string): Promise<ProjectSettings> {
    return await this.retry(async () => {
      const projectSettingsPath = getProjectSettingsPath(projectPath);

      if (!(await fs.pathExists(projectSettingsPath))) {
        throw new FileNotFoundError(CoreSource, projectSettingsPath);
      }
      try {
        const res = await loadProjectSettingsByProjectPath(projectPath, true);
        if (res.isErr()) {
          throw res.error;
        }
        return res.value;
      } catch (error: any) {
        throw ReadFileError(error);
      }
    });
  }

  public async getTaskJson(projectPath: string): Promise<any> {
    try {
      const taskFilePath = path.resolve(projectPath, ".vscode", "tasks.json");
      const content = await fs.readFile(taskFilePath, "utf-8");
      return commentJson.parse(content);
    } catch {
      return undefined;
    }
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
