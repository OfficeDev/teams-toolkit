// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { LocalEnvs } from "../../../common/local/localEnvProvider";
import { ApiConnectorConfiguration } from "./utils";

declare type ApiConnectors = Record<string, Record<string, string>>;
export class ApiManager {
  private apiConnector: ApiConnectors = {};
  public updateServerEnvs(localEnvs: LocalEnvs): LocalEnvs {
    let customEnvs = localEnvs.customizedLocalEnvs;
    for (const item in this.apiConnector) {
      const apis = this.apiConnector[item];
      customEnvs = { ...customEnvs, ...apis };
    }
    localEnvs.customizedLocalEnvs = customEnvs;
    return localEnvs;
  }

  public addApiConfig(config: ApiConnectorConfiguration) {
    const serverName: string = config.ServerName;
    if (!this.apiConnector[serverName]) {
      this.apiConnector[serverName] = {};
    }
    const endPoint = "API_" + serverName + "_ENDPOINT";
    const authName = "API_" + serverName + "_AUTHENTICATION_TYPE";
    const userName = "API_" + serverName + "_USERNAME";
    const passWd = "API_" + serverName + "_PASSWORD";
    if (config.ApiUserName) {
      this.apiConnector[serverName][userName] = config.ApiUserName;
    }
    if (config.ApiAuthType) {
      this.apiConnector[serverName][authName] = config.ApiAuthType;
    }
    if (config.EndPoint) {
      this.apiConnector[serverName][endPoint] = config.EndPoint;
    }
    this.apiConnector[serverName][passWd] = "";
  }
}
