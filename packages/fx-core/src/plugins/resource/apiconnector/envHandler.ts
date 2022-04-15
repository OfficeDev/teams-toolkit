// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { LocalEnvProvider, LocalEnvs } from "../../../common/local/localEnvProvider";
import { AADAuthConfig, ApiConnectorConfiguration, BasicAuthConfig } from "./config";
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
    const endPoint = Constants.envPrefix + apiName + "_ENDPOINT";
    const authName = Constants.envPrefix + apiName + "_AUTHENTICATION_TYPE";
    this.apiConnector[apiName].set(authName, config.AuthConfig.AuthType);
    this.apiConnector[apiName].set(endPoint, config.EndPoint);
    if (config.AuthConfig.AuthType === AuthType.BASIC) {
      this.addBasicEnvs(config);
    } else if (config.AuthConfig.AuthType === AuthType.AAD) {
      this.addAADEnvs(config);
    }
  }

  public addBasicEnvs(config: ApiConnectorConfiguration) {
    const apiName: string = config.APIName.toUpperCase();
    const apiConfig = this.apiConnector[apiName];
    const userName = Constants.envPrefix + apiName + "_USERNAME";
    const passWd = Constants.envPrefix + apiName + "_PASSWORD";
    const authConfig = config.AuthConfig as BasicAuthConfig;
    apiConfig.set(userName, authConfig.UserName);
    apiConfig.set(passWd, "");
  }

  public addAADEnvs(config: ApiConnectorConfiguration) {
    const apiName: string = config.APIName.toUpperCase();
    const apiConfig = this.apiConnector[apiName];
    const authConfig = config.AuthConfig as AADAuthConfig;
    if (!authConfig.ReuseTeamsApp) {
      const tenantId = Constants.envPrefix + apiName + "_TENANT_ID";
      const clientId = Constants.envPrefix + apiName + "_CLIENT_ID";
      const clientSecret = Constants.envPrefix + apiName + "_CLIENT_SECRET";
      apiConfig.set(tenantId, authConfig.TenantId!);
      apiConfig.set(clientId, authConfig.ClientId!);
      apiConfig.set(clientSecret, "");
    }
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

  public async saveLocalEnvFile(): Promise<string> {
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
    return srcFile; // return modified env file
  }

  private updateLocalApiEnvs(localEnvs: LocalEnvs): LocalEnvs {
    const res: LocalEnvs = this.apiDataManager.updateLocalApiEnvs(localEnvs);
    return res;
  }
}
