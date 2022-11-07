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

import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import {
  getProjectSettingsPath,
  loadProjectSettingsByProjectPath,
} from "../../core/middleware/projectSettingsLoader";
import { ComponentNames, PathConstants } from "../constants";
import { DebugAction } from "./common";
import { DebugArgumentEmptyError, errorSource, InvalidTabBaseUrlError } from "./error";
import { LocalEnvKeys, LocalEnvProvider } from "./localEnvProvider";
import { checkM365Tenant } from "./utils";

const tabDebugMessages = {
  savingStates: "Saving the states of tab to configure manifest and AAD app ...",
  settingEnvs:
    "Saving the environment variables of tab to set up the development environment and start the local server ...",
  statesSaved: "The states of tab are saved in %s",
  envsSet: "The environment variables of tab are saved in %s",
};

export interface TabDebugArgs {
  baseUrl?: string;
}

export class TabDebugHandler {
  private readonly projectPath: string;
  private args: TabDebugArgs;
  private readonly m365TokenProvider: M365TokenProvider;
  private readonly logger: LogProvider;
  private readonly telemetry: TelemetryReporter;
  private readonly ui: UserInteraction;

  private projectSettingsV3?: ProjectSettingsV3;
  private cryptoProvider?: CryptoProvider;
  private envInfoV3?: v3.EnvInfoV3;

  constructor(
    projectPath: string,
    args: TabDebugArgs,
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
      startMessage: tabDebugMessages.savingStates,
      run: this.saveStates.bind(this),
    });
    actions.push({
      startMessage: tabDebugMessages.settingEnvs,
      run: this.setEnvs.bind(this),
    });
    return actions;
  }

  private async validateArgs(): Promise<Result<string[], FxError>> {
    if (!this.args.baseUrl || this.args.baseUrl.trim().length === 0) {
      return err(DebugArgumentEmptyError("baseUrl"));
    }
    try {
      const url = new URL(this.args.baseUrl);
      if (url.protocol !== "https:") {
        return err(InvalidTabBaseUrlError());
      }
    } catch {
      return err(InvalidTabBaseUrlError());
    }
    return ok([]);
  }

  private async saveStates(): Promise<Result<string[], FxError>> {
    try {
      const result = await this.validateArgs();
      if (result.isErr()) {
        return err(result.error);
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

      if (this.envInfoV3.state[ComponentNames.TeamsTab]) {
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

      this.envInfoV3.state[ComponentNames.TeamsTab] =
        this.envInfoV3.state[ComponentNames.TeamsTab] || {};

      // set endpoint, domain, indexPath to state
      this.envInfoV3.state[ComponentNames.TeamsTab].endpoint = this.args.baseUrl;
      this.envInfoV3.state[ComponentNames.TeamsTab].domain = "localhost";
      this.envInfoV3.state[ComponentNames.TeamsTab].indexPath = PathConstants.reactTabIndexPath;

      const statePath = await environmentManager.writeEnvState(
        cloneDeep(this.envInfoV3.state),
        this.projectPath,
        this.cryptoProvider,
        environmentManager.getLocalEnvName(),
        true
      );
      if (statePath.isErr()) {
        return err(statePath.error);
      }

      return ok([util.format(tabDebugMessages.statesSaved, path.normalize(statePath.value))]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }

  private async setEnvs(): Promise<Result<string[], FxError>> {
    try {
      const localEnvProvider = new LocalEnvProvider(this.projectPath);
      const frontendEnvs = await localEnvProvider.loadFrontendLocalEnvs();

      frontendEnvs.template[LocalEnvKeys.frontend.template.Browser] = "none";
      frontendEnvs.template[LocalEnvKeys.frontend.template.Https] = "true";

      const url = new URL(this.envInfoV3?.state[ComponentNames.TeamsTab].endpoint as string);
      frontendEnvs.template[LocalEnvKeys.frontend.template.Port] = url.port;

      // certificate envs are set when cheking prerequisites

      const envPath = await localEnvProvider.saveFrontendLocalEnvs(frontendEnvs);

      return ok([util.format(tabDebugMessages.envsSet, path.normalize(envPath))]);
    } catch (error: unknown) {
      return err(assembleError(error, errorSource));
    }
  }
}
