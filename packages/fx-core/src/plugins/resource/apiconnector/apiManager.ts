// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import { LocalEnvs } from "../../../common/local/localEnvProvider";
import { ApiConnectorConfiguration } from "./utils";

declare type ApiConnectors = Record<string, Record<string, string>>;
export class ApiManager {
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
    const apiName: string = config.APIName;
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
