// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { cloneDeep } from "lodash";
import * as path from "path";
import * as util from "util";

import {
  assembleError,
  CryptoProvider,
  err,
  FxError,
  ok,
  ProjectSettingsV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";

import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { Constants } from "../../plugins/resource/frontend/constants";
import { ComponentNames } from "../constants";
import { DebugAction } from "./common";
import { errorSource, InvalidTabDebugArgsError } from "./error";
import { LocalEnvKeys, LocalEnvProvider } from "./localEnvProvider";

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

  private projectSettingsV3?: ProjectSettingsV3;
  private cryptoProvider?: CryptoProvider;
  private envInfoV3?: v3.EnvInfoV3;

  constructor(projectPath: string, args: TabDebugArgs) {
    this.projectPath = projectPath;
    this.args = args;
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
    if (!this.args.baseUrl) {
      return err(InvalidTabDebugArgsError());
    }
    const pattern = /https:\/\/localhost:\d+/;
    const result = this.args.baseUrl.match(pattern);
    if (!result) {
      return err(InvalidTabDebugArgsError());
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
      this.envInfoV3.state[ComponentNames.TeamsTab] =
        this.envInfoV3.state[ComponentNames.TeamsTab] || {};

      // set endpoint, domain, indexPath to state
      this.envInfoV3.state[ComponentNames.TeamsTab].endpoint = this.args.baseUrl;
      this.envInfoV3.state[ComponentNames.TeamsTab].domain = "localhost";
      this.envInfoV3.state[ComponentNames.TeamsTab].indexPath = Constants.FrontendIndexPath;

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
