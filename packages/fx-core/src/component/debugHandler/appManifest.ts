// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import fs from "fs-extra";
import { cloneDeep } from "lodash";

import {
  assembleError,
  err,
  FxError,
  LogProvider,
  M365TokenProvider,
  ok,
  ProjectSettingsV3,
  Result,
  TelemetryReporter,
  UserInteraction,
  v3,
  Void,
} from "@microsoft/teamsfx-api";

import { AppStudioScopes } from "../../common/tools";
import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { AppStudioClient } from "../../plugins/resource/appstudio/appStudio";
import { ComponentNames } from "../constants";
import { buildTeamsAppPackage } from "../resource/appManifest/appStudio";
import { errorSource } from "./error";

export interface AppManifestDebugArgs {
  manifestPackagePath?: string;
}

export class AppManifestDebugHandler {
  private readonly projectPath: string;
  private args: AppManifestDebugArgs;
  private readonly m365TokenProvider: M365TokenProvider;
  private readonly logger?: LogProvider;
  private readonly telemetry?: TelemetryReporter;
  private readonly ui?: UserInteraction;

  constructor(
    projectPath: string,
    args: AppManifestDebugArgs,
    m365TokenProvider: M365TokenProvider,
    logger?: LogProvider,
    telemetry?: TelemetryReporter,
    ui?: UserInteraction
  ) {
    this.projectPath = projectPath;
    this.args = args;
    this.m365TokenProvider = m365TokenProvider;
    this.logger = logger;
    this.telemetry = telemetry;
    this.ui = ui;
  }

  // TODO: output message
  public async prepare(): Promise<Result<Void, FxError>> {
    try {
      const checkArgsResult = await this.checkArgs();
      if (checkArgsResult.isErr()) {
        return err(checkArgsResult.error);
      }

      const projectSettingsResult = await loadProjectSettingsByProjectPath(this.projectPath, true);
      if (projectSettingsResult.isErr()) {
        return err(projectSettingsResult.error);
      }
      const projectSettingsV3: ProjectSettingsV3 = projectSettingsResult.value as ProjectSettingsV3;

      const cryptoProvider = new LocalCrypto(projectSettingsV3.projectId);

      const envInfoResult = await environmentManager.loadEnvInfo(
        this.projectPath,
        cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );
      if (envInfoResult.isErr()) {
        return err(envInfoResult.error);
      }
      const envInfoV3: v3.EnvInfoV3 = envInfoResult.value;
      envInfoV3.state[ComponentNames.AppManifest] =
        envInfoV3.state[ComponentNames.AppManifest] || {};

      if (!checkArgsResult.value) {
        // build
        const result = await buildTeamsAppPackage(this.projectPath, envInfoV3);
        if (result.isErr()) {
          return err(result.error);
        }
        this.args.manifestPackagePath = result.value;
      }

      // upload
      const tokenResult = await this.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const archivedFile = await fs.readFile(this.args.manifestPackagePath!);
      const appdefinition = await AppStudioClient.importApp(
        archivedFile,
        tokenResult.value,
        this.logger,
        true
      );

      // set teamsAppId, tenantId to state
      envInfoV3.state[ComponentNames.AppManifest].teamsAppId = appdefinition.teamsAppId;
      envInfoV3.state[ComponentNames.AppManifest].tenantId = appdefinition.tenantId;

      await environmentManager.writeEnvState(
        cloneDeep(envInfoV3.state),
        this.projectPath,
        cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );

      return ok(Void);
    } catch (error: any) {
      return err(assembleError(error, errorSource));
    }
  }

  // return true if specifying manifest app package
  private async checkArgs(): Promise<Result<boolean, FxError>> {
    return ok(
      this.args.manifestPackagePath !== undefined && this.args.manifestPackagePath.trim().length > 0
    );
  }
}
