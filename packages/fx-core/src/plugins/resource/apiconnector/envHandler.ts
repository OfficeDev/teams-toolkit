// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { LocalEnvProvider, LocalEnvs } from "../../../common/local/localEnvProvider";
import { ApiConnectorConfiguration, BasicAuthConfig } from "./config";
import { ApiConnectorResult, ResultFactory } from "./result";
import { AuthType, ComponentType, Constants } from "./constants";
import { ErrorMessage } from "./errors";

declare type ApiConnectors = Record<string, Map<string, string>>;
export class ApiDataManager {
  private apiConnector: ApiConnectors = {};
  public updateLocalApiEnvs(localEnvs: LocalEnvs): LocalEnvs {
    const customEnvs = localEnvs.customizedLocalEnvs;
    for (const item in this.apiConnector) {
      const apis = this.apiConnector[item];
      for (const [key, value] of Array.from(apis)) {
        customEnvs[key] = value;
      }
    }
    localEnvs.customizedLocalEnvs = customEnvs;
    return localEnvs;
  }

  public addApiEnvs(config: ApiConnectorConfiguration) {
    const apiName: string = config.APIName.toUpperCase();
    if (!this.apiConnector[apiName]) {
      this.apiConnector[apiName] = new Map();
    }
    if (config.AuthConfig.AuthType === AuthType.BASIC) {
      this.addBasicEnvs(config);
    }
  }

  public addBasicEnvs(config: ApiConnectorConfiguration) {
    const apiName: string = config.APIName.toUpperCase();
    const apiConfig = this.apiConnector[apiName];
    const endPoint = "API_" + apiName + "_ENDPOINT";
    const authName = "API_" + apiName + "_AUTHENTICATION_TYPE";
    const userName = "API_" + apiName + "_USERNAME";
    const passWd = "API_" + apiName + "_PASSWORD";
    const authConfig = config.AuthConfig as BasicAuthConfig;
    apiConfig.set(userName, authConfig.UserName);
    apiConfig.set(authName, authConfig.AuthType);
    apiConfig.set(endPoint, config.EndPoint);
    apiConfig.set(passWd, "");
  }
}
export class EnvHandler {
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
    const srcFile = path.join(this.projectRoot, this.componentType, Constants.envFileName);
    if (!(await fs.pathExists(srcFile))) {
      await fs.createFile(srcFile);
    }
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
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorFileCreateFailError.name,
        ErrorMessage.ApiConnectorFileCreateFailError.message(srcFile)
      );
    }
    return ResultFactory.Success();
  }

  private updateLocalApiEnvs(localEnvs: LocalEnvs): LocalEnvs {
    const res: LocalEnvs = this.apiDataManager.updateLocalApiEnvs(localEnvs);
    return res;
  }
}
