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
  UserInteraction,
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
import { DepsType } from "../deps-checker/depsChecker";
import { ProjectSettingsHelper } from "./projectSettingsHelper";
import { LocalCertificateManager } from "./localCertificateManager";

export class LocalEnvManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetry: TelemetryReporter | undefined;
  private readonly ui: UserInteraction | undefined;

  constructor(logger?: LogProvider, telemetry?: TelemetryReporter, ui?: UserInteraction) {
    this.logger = logger;
    this.telemetry = telemetry;
    this.ui = ui;
  }

  public getActiveDependencies(projectSettings: ProjectSettings): DepsType[] {
    const depsTypes: DepsType[] = [];
    const isSPFx = ProjectSettingsHelper.isSpfx(projectSettings);
    const includeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
    const includeSimpleAuth = ProjectSettingsHelper.includeSimpleAuth(projectSettings);
    const includeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    const includeBot = ProjectSettingsHelper.includeBot(projectSettings);

    // NodeJS
    if (isSPFx) {
      depsTypes.push(DepsType.SpfxNode);
    } else if (includeBackend) {
      depsTypes.push(DepsType.FunctionNode);
    } else {
      depsTypes.push(DepsType.AzureNode);
    }

    // Dotnet
    if ((includeFrontend && includeSimpleAuth) || includeBackend) {
      depsTypes.push(DepsType.Dotnet);
    }

    // Function core tool
    if (includeBackend) {
      depsTypes.push(DepsType.FuncCoreTools);
    }

    // Ngrok
    if (includeBot) {
      depsTypes.push(DepsType.Ngrok);
    }

    return depsTypes;
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
    return await getPortsInUse(projectPath, projectSettings, false, this.logger);
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

  public async resolveLocalCertificate(trustDevCert: boolean): Promise<boolean | undefined> {
    const certManager = new LocalCertificateManager(this.ui, this.logger);
    const localCert = await certManager.setupCertificate(trustDevCert);
    return localCert.isTrusted;
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
