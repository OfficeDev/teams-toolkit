// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import {
  assembleError,
  err,
  FxError,
  ok,
  ProjectSettingsV3,
  Result,
  v3,
  Void,
} from "@microsoft/teamsfx-api";

import { LocalCrypto } from "../../core/crypto";
import { environmentManager } from "../../core/environment";
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import { Constants } from "../../plugins/resource/frontend/constants";
import { ComponentNames } from "../constants";
import { errorSource, InvalidTabDebugArgsError } from "./error";

export interface TabDebugArgs {
  baseUrl?: string;
}

export class TabDebugHandler {
  private readonly projectPath: string;
  private args: TabDebugArgs;

  constructor(projectPath: string, args: TabDebugArgs) {
    this.projectPath = projectPath;
    this.args = args;
  }

  public async setUp(): Promise<Result<Void, FxError>> {
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
      envInfoV3.state[ComponentNames.TeamsTab] = envInfoV3.state[ComponentNames.TeamsTab] || {};

      // set endpoint, domain, indexPath to state
      envInfoV3.state[ComponentNames.TeamsTab].endpoint = this.args.baseUrl;
      envInfoV3.state[ComponentNames.TeamsTab].domain = "localhost";
      envInfoV3.state[ComponentNames.TeamsTab].indexPath = Constants.FrontendIndexPath;

      await environmentManager.writeEnvState(
        envInfoV3.state,
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

  private async checkArgs(): Promise<Result<boolean, FxError>> {
    if (!this.args.baseUrl) {
      return err(InvalidTabDebugArgsError());
    }
    const pattern = /https:\/\/localhost:\d+/;
    const result = this.args.baseUrl.match(pattern);
    if (!result) {
      return err(InvalidTabDebugArgsError());
    }
    return ok(true);
  }
}
