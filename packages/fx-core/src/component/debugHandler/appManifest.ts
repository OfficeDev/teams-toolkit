// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import fs from "fs-extra";
import { cloneDeep } from "lodash";
import * as path from "path";
import * as util from "util";

import {
  assembleError,
  CryptoProvider,
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
} from "@microsoft/teamsfx-api";

import { AppStudioScopes } from "../../common/tools";
import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import {
  getProjectSettingsPath,
  loadProjectSettingsByProjectPath,
} from "../../core/middleware/projectSettingsLoader";
import { AppStudioClient } from "../resource/appManifest/appStudioClient";
import { ComponentNames } from "../constants";
import {
  buildTeamsAppPackage,
  checkIfAppInDifferentAcountSameTenant,
} from "../resource/appManifest/appStudio";
import { DebugAction } from "./common";
import {
  AppManifestPackageNotExistError,
  DebugArgumentEmptyError,
  errorSource,
  InvalidAppManifestPackageFileFormatError,
} from "./error";
import { checkM365Tenant } from "./utils";
import { v4 } from "uuid";

const appManifestDebugMessages = {
  buildingAndSavingAppManifest:
    "Resolving manifest template and generating the Teams app package ...",
  uploadingAppPackage: "Uploading Teams app package via Teams Developer Portal ...",
  savingStates: "Saving the states of Teams app ...",
  appManifestSaved: "Teams app manifest is resolved and app package is saved in %s",
  useExistingAppManifest:
    "Skip building Teams app manifest but use the existing Teams app package from args",
  statesSaved: "The states of Teams app manifest are saved in %s",
  skipSavingStates: "Skip saving the states for Teams app manifest",
  appPackageUploaded: "Teams app package is uploaded",
};

export interface AppManifestDebugArgs {
  appPackagePath?: string;
}

export class AppManifestDebugHandler {
  private readonly projectPath: string;
  private args: AppManifestDebugArgs;
  private readonly m365TokenProvider: M365TokenProvider;
  private readonly logger: LogProvider;
  private readonly telemetry: TelemetryReporter;
  private readonly ui: UserInteraction;

  private existing = false;

  private projectSettingsV3?: ProjectSettingsV3;
  private cryptoProvider?: CryptoProvider;
  private envInfoV3?: v3.EnvInfoV3;

  constructor(
    projectPath: string,
    args: AppManifestDebugArgs,
    m365TokenProvider: M365TokenProvider,
    logger: LogProvider,
    telemetry: TelemetryReporter,
    ui: UserInteraction
  ) {
    this.projectPath = projectPath;
    this.args = args;
    this.m365TokenProvider = m365TokenProvider;
    this.logger = logger;
    this.telemetry = telemetry;
    this.ui = ui;
  }

  public getActions(): DebugAction[] {
    const actions: DebugAction[] = [];
    actions.push({
      startMessage: appManifestDebugMessages.buildingAndSavingAppManifest,
      run: this.buildAndSaveAppManifest.bind(this),
    });
    actions.push({
      startMessage: appManifestDebugMessages.uploadingAppPackage,
      run: this.uploadAppManifestPackage.bind(this),
    });
    actions.push({
      startMessage: appManifestDebugMessages.savingStates,
      run: this.saveStates.bind(this),
    });
    return actions;
  }

  private async validateArgs(): Promise<Result<string[], FxError>> {
    if (this.args.appPackagePath !== undefined && this.args.appPackagePath.trim().length === 0) {
      return err(DebugArgumentEmptyError("appPackagePath"));
    }

    if (this.args.appPackagePath) {
      this.args.appPackagePath = this.args.appPackagePath.trim();
      if (this.args.appPackagePath.length > 0) {
        if (!(await fs.pathExists(this.args.appPackagePath))) {
          return err(AppManifestPackageNotExistError(this.args.appPackagePath));
        }
        if (path.extname(this.args.appPackagePath) != ".zip") {
          return err(InvalidAppManifestPackageFileFormatError());
        }
        this.existing = true;
      }
    }
    return ok([]);
  }

  private async buildAndSaveAppManifest(): Promise<Result<string[], FxError>> {
    try {
      const result = await this.validateArgs();
      if (result.isErr()) {
        return err(result.error);
      }

      if (this.args.appPackagePath) {
        return ok([appManifestDebugMessages.useExistingAppManifest]);
      }

      const projectSettingsResult = await loadProjectSettingsByProjectPath(this.projectPath, true);
      if (projectSettingsResult.isErr()) {
        return err(projectSettingsResult.error);
      }

      // save project settings as the project id may be updated
      const projectSettingsPath = getProjectSettingsPath(this.projectPath);
      await fs.writeFile(projectSettingsPath, JSON.stringify(projectSettingsResult.value, null, 4));

      this.projectSettingsV3 = projectSettingsResult.value as ProjectSettingsV3;
      this.cryptoProvider = new LocalCrypto(this.projectSettingsV3.projectId);

      const envInfoResult = await environmentManager.loadEnvInfo(
        this.projectPath,
        this.cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );
      if (envInfoResult.isErr()) {
        return err(envInfoResult.error);
      }
      this.envInfoV3 = envInfoResult.value;

      if (this.envInfoV3.state[ComponentNames.AppManifest]) {
        const checkResult = await checkM365Tenant(
          this.projectPath,
          this.projectSettingsV3,
          this.envInfoV3,
          this.m365TokenProvider,
          this.logger,
          this.telemetry,
          this.ui,
          this.cryptoProvider
        );
        if (checkResult.isErr()) {
          return err(checkResult.error);
        }
      }

      this.envInfoV3.state[ComponentNames.AppManifest] =
        this.envInfoV3.state[ComponentNames.AppManifest] || {};

      // For SPFx manifest
      this.envInfoV3.config.isLocalDebug = true;

      // Local debug if switching to a different account in same tenant
      if (!!this.envInfoV3.state[ComponentNames.AppManifest].teamsAppId) {
        const checkAppInDifferentAccount = await checkIfAppInDifferentAcountSameTenant(
          this.envInfoV3.state[ComponentNames.AppManifest].teamsAppId,
          this.m365TokenProvider,
          this.logger
        );
        if (checkAppInDifferentAccount.isOk() && checkAppInDifferentAccount.value) {
          this.envInfoV3.state[ComponentNames.AppManifest].teamsAppId = v4();
        }
      }

      // build
      const packagePathResult = await buildTeamsAppPackage(
        this.projectSettingsV3,
        this.projectPath,
        this.envInfoV3
      );
      if (packagePathResult.isErr()) {
        return err(packagePathResult.error);
      }
      this.args.appPackagePath = packagePathResult.value;

      return ok([
        util.format(
          appManifestDebugMessages.appManifestSaved,
          path.normalize(packagePathResult.value)
        ),
      ]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async uploadAppManifestPackage(): Promise<Result<string[], FxError>> {
    try {
      // upload
      const tokenResult = await this.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const archivedFile = await fs.readFile(this.args.appPackagePath!);
      const appdefinition = await AppStudioClient.importApp(
        archivedFile,
        tokenResult.value,
        this.logger,
        true
      );

      if (!this.existing) {
        // set teamsAppId, tenantId to state
        this.envInfoV3!.state[ComponentNames.AppManifest].teamsAppId = appdefinition.teamsAppId;
        this.envInfoV3!.state[ComponentNames.AppManifest].tenantId = appdefinition.tenantId;
      }

      return ok([appManifestDebugMessages.appPackageUploaded]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async saveStates(): Promise<Result<string[], FxError>> {
    try {
      if (this.existing) {
        return ok([appManifestDebugMessages.skipSavingStates]);
      }

      const statePath = await environmentManager.writeEnvState(
        cloneDeep(this.envInfoV3!.state),
        this.projectPath,
        this.cryptoProvider!,
        environmentManager.getLocalEnvName(),
        true
      );
      if (statePath.isErr()) {
        return err(statePath.error);
      }

      return ok([
        util.format(appManifestDebugMessages.statesSaved, path.normalize(statePath.value)),
      ]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }
}
