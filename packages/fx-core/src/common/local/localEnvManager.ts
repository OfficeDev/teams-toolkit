// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  ConfigFolderName,
  InputConfigsFolderName,
  Json,
  LogProvider,
  ProjectSettings,
  ProjectSettingsFileName,
  TelemetryReporter,
  UserError,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";

import { convertToLocalEnvs } from "./localSettingsHelper";
import { LocalSettingsProvider } from "../localSettingsProvider";
import { getNpmInstallLogInfo, NpmInstallLogInfo } from "./npmLogHelper";
import { getPortsInUse } from "./portChecker";
import { waitSeconds } from "../tools";
import { LocalCrypto } from "../../core/crypto";
import { CoreSource, ReadFileError } from "../../core/error";
import { DependencyStatus, DepsManager } from "../deps-checker/depsManager";
import { DepsType } from "../deps-checker/depsChecker";
import { ProjectSettingsHelper } from "./projectSettingsHelper";
import { CheckerFactory } from "../deps-checker/checkerFactory";
import { DepsLoggerAdapter, DepsTelemetryAdapter } from "./depsAdapter";

export class LocalEnvManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetry: TelemetryReporter | undefined;

  constructor(logger?: LogProvider, telemetry?: TelemetryReporter) {
    this.logger = logger;
    this.telemetry = telemetry;
  }

  public async checkDependencies(projectSettings: ProjectSettings): Promise<
    {
      type: DepsType;
      isInstalled: boolean;
    }[]
  > {
    const depsLogger = new DepsLoggerAdapter(this.logger);
    const depsTelemetry = new DepsTelemetryAdapter(this.telemetry);

    const dependencies = this.getValidDeps(projectSettings);
    const result = [];
    for (const type of dependencies) {
      const checker = CheckerFactory.createChecker(type, depsLogger, depsTelemetry);
      const status = {
        type: type,
        isInstalled: await checker.isInstalled(),
      };
      result.push(status);
    }
    return result;
  }

  public async checkAndResolveDependencies(
    projectSettings: ProjectSettings
  ): Promise<DependencyStatus[]> {
    const depsLogger = new DepsLoggerAdapter(this.logger);
    const depsTelemetry = new DepsTelemetryAdapter(this.telemetry);
    const depsManager = new DepsManager(depsLogger, depsTelemetry);

    return await depsManager.ensureDependencies(this.getValidDeps(projectSettings), {
      fastFail: true,
    });
  }

  public async getLocalDebugEnvs(
    projectPath: string,
    projectSettings: ProjectSettings,
    localSettings: Json | undefined
  ): Promise<Record<string, string>> {
    return await convertToLocalEnvs(projectPath, projectSettings, localSettings, this.logger);
  }

  public async getNpmInstallLogInfo(): Promise<NpmInstallLogInfo | undefined> {
    return await getNpmInstallLogInfo();
  }

  public async getPortsInUse(
    projectPath: string,
    projectSettings: ProjectSettings
  ): Promise<number[]> {
    return await getPortsInUse(projectPath, projectSettings);
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

  private getValidDeps(projectSettings: ProjectSettings): DepsType[] {
    const depsTypes: DepsType[] = [];

    if (ProjectSettingsHelper.includeFrontend(projectSettings)) {
      depsTypes.push(DepsType.Dotnet);
    }

    if (ProjectSettingsHelper.includeBackend(projectSettings)) {
      depsTypes.push(DepsType.FuncCoreTools);
    }

    if (ProjectSettingsHelper.includeBot(projectSettings)) {
      depsTypes.push(DepsType.Ngrok);
    }

    return depsTypes;
  }
}
