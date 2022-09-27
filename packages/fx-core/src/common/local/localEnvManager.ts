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
  v2,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";

import * as localStateHelper from "./localStateHelper";
import { LocalSettingsProvider } from "../localSettingsProvider";
import { getNpmInstallLogInfo, NpmInstallLogInfo } from "./npmLogHelper";
import { getPortsInUse, getPortsFromProject } from "./portChecker";
import { waitSeconds } from "../tools";
import { LocalCrypto } from "../../core/crypto";
import { CoreSource, ReadFileError, NgrokConfigError } from "../../core/error";
import { DepsType } from "../deps-checker/depsChecker";
import { ProjectSettingsHelper } from "./projectSettingsHelper";
import { LocalCertificate, LocalCertificateManager } from "./localCertificateManager";
import { DepsManager } from "../deps-checker/depsManager";
import { LocalStateProvider } from "../localStateProvider";
import { getDefaultString, getLocalizedString } from "../localizeUtils";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { convertEnvStateV3ToV2 } from "../../component/migrate";
import { getNgrokTunnelFromApi } from "../../plugins/solution/fx-solution/debug/util/ngrok";
import { LocalEnvKeys, LocalEnvProvider } from "../../component/debugHandler/localEnvProvider";

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
    const includeFuncHostedBot = ProjectSettingsHelper.includeFuncHostedBot(projectSettings);

    // NodeJS
    if (isSPFx) {
      depsTypes.push(DepsType.SpfxNode);
    } else if (includeBackend || includeFuncHostedBot) {
      depsTypes.push(DepsType.FunctionNode);
    } else {
      depsTypes.push(DepsType.AzureNode);
    }

    // Dotnet
    if ((includeFrontend && includeSimpleAuth) || includeBackend) {
      depsTypes.push(DepsType.Dotnet);
    }

    // Function core tool
    if (includeBackend || includeFuncHostedBot) {
      depsTypes.push(DepsType.FuncCoreTools);
    }

    // Ngrok
    if (includeBot) {
      depsTypes.push(DepsType.Ngrok);
    }

    return DepsManager.sortBySequence(depsTypes);
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

  public async getNgrokTunnelFromApi(
    webServiceUrl: string
  ): Promise<{ src: string; dist: string } | undefined> {
    return await getNgrokTunnelFromApi(webServiceUrl);
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
      const projectSettingsPath = path.resolve(
        projectPath,
        `.${ConfigFolderName}`,
        InputConfigsFolderName,
        ProjectSettingsFileName
      );

      if (!(await fs.pathExists(projectSettingsPath))) {
        throw new UserError(
          CoreSource,
          "FileNotFoundError",
          getDefaultString("error.FileNotFoundError", projectSettingsPath),
          getLocalizedString("error.FileNotFoundError", projectSettingsPath)
        );
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

  public async resolveLocalCertificate(
    trustDevCert: boolean,
    localEnvProvider?: LocalEnvProvider
  ): Promise<LocalCertificate> {
    // Do not print any log in LocalCertificateManager, use the error message returned instead.
    const certManager = new LocalCertificateManager(this.ui);
    const res = await certManager.setupCertificate(trustDevCert);
    if (trustDevCert && localEnvProvider) {
      const frontendEnvs = await localEnvProvider.loadFrontendLocalEnvs();
      frontendEnvs.template[LocalEnvKeys.frontend.template.SslCrtFile] = res.certPath;
      frontendEnvs.template[LocalEnvKeys.frontend.template.SslKeyFile] = res.keyPath;
      await localEnvProvider.saveFrontendLocalEnvs(frontendEnvs);
    }
    return res;
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
