// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { LocalEnvProvider, LocalEnvs } from "../../../common/local/localEnvProvider";
import { ApiConnectorConfiguration } from "./utils";
import { ApiConnectorResult, ResultFactory } from "./result";
import { ComponentType } from "./constants";
import { ErrorMessage } from "./errors";

declare type ApiConnectors = Record<string, Record<string, string>>;
export class ApiDataManager {
  private apiConnector: ApiConnectors = {};
  public updateLocalApiEnvs(localEnvs: LocalEnvs): LocalEnvs {
    let customEnvs = localEnvs.customizedLocalEnvs;
    for (const item in this.apiConnector) {
      const apis = this.apiConnector[item];
      customEnvs = { ...customEnvs, ...apis };
    }
    localEnvs.customizedLocalEnvs = customEnvs;
    return localEnvs;
  }

  public addApiEnvs(config: ApiConnectorConfiguration) {
    const apiName: string = config.APIName.toUpperCase();
    if (!this.apiConnector[apiName]) {
      this.apiConnector[apiName] = {};
    }
    const endPoint = "API_" + apiName + "_ENDPOINT";
    const authName = "API_" + apiName + "_AUTHENTICATION_TYPE";
    const userName = "API_" + apiName + "_USERNAME";
    const passWd = "API_" + apiName + "_PASSWORD";
    if (config.ApiUserName) {
      this.apiConnector[apiName][userName] = config.ApiUserName;
    }
    if (config.ApiAuthType) {
      this.apiConnector[apiName][authName] = config.ApiAuthType;
    }
    if (config.EndPoint) {
      this.apiConnector[apiName][endPoint] = config.EndPoint;
    }
    this.apiConnector[apiName][passWd] = "";
  }
}
export class EnvHandler {
  public static readonly LocalEnvFileName: string = ".env.teamsfx.local";
  private readonly projectRoot: string;
  private readonly componentType: string;
  private apiDataManager: ApiDataManager;

  constructor(workspaceFolder: string, componentType: string) {
    this.projectRoot = workspaceFolder;
    this.componentType = componentType;
    this.apiDataManager = new ApiDataManager();
  }

  public updateEnvs(config: ApiConnectorConfiguration) {
    this.apiDataManager.addApiEnvs(config);
  }

  public async saveLocalEnvFile(): Promise<ApiConnectorResult> {
    // backup .env.teamsfx.local file with timestamp
    const timestamp = Date.now();
    const backupFileName: string = EnvHandler.LocalEnvFileName + "." + timestamp;
    const srcFile = path.join(this.projectRoot, this.componentType, EnvHandler.LocalEnvFileName);
    const tmpFile = path.join(this.projectRoot, this.componentType, backupFileName);
    if (!(await fs.pathExists(srcFile))) {
      await fs.createFile(srcFile);
    }
    await fs.move(srcFile, tmpFile);
    // update localEnvs
    try {
      const provider: LocalEnvProvider = new LocalEnvProvider(this.projectRoot);
      if (this.componentType === ComponentType.BOT) {
        let localEnvsBot: LocalEnvs = await provider.loadBotLocalEnvs();
        localEnvsBot = this.updateLocalApiEnvs(localEnvsBot);
        await provider.saveLocalEnvs(undefined, undefined, localEnvsBot);
      } else if (this.componentType === ComponentType.API) {
        let localEnvsBE: LocalEnvs = await provider.loadBackendLocalEnvs();
        localEnvsBE = this.updateLocalApiEnvs(localEnvsBE);
        await provider.saveLocalEnvs(undefined, localEnvsBE, undefined);
      }
    } catch (err) {
      await fs.move(tmpFile, srcFile);
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorFileCreateFailError.name,
        ErrorMessage.ApiConnectorFileCreateFailError.message(srcFile)
      );
    } finally {
      await fs.remove(tmpFile);
    }
    return ResultFactory.Success();
  }

  private updateLocalApiEnvs(localEnvs: LocalEnvs): LocalEnvs {
    const res: LocalEnvs = this.apiDataManager.updateLocalApiEnvs(localEnvs);
    return res;
  }
}
