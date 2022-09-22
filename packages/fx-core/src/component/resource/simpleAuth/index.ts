// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks } from "@feathersjs/hooks/lib";
import {
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import { EnvInfoV3 } from "@microsoft/teamsfx-api/build/v3";
import "reflect-metadata";
import { Service } from "typedi";
import { LocalSettingsSimpleAuthKeys } from "../../../common/localSettingsConstants";
import { LocalStateSimpleAuthKeys } from "../../../common/localStateConstants";
import { getAllowedAppIds } from "../../../common/tools";
import { Constants, Messages } from "./constants";
import { EndpointInvalidError, NoConfigError } from "./errors";
import { ResultFactory } from "./result";
import { Utils } from "./utils/common";
import { ComponentNames } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";

@Service(ComponentNames.SimpleAuth)
export class SimpleAuth {
  @hooks([
    ActionExecutionMW({
      errorSource: "sa",
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-simple-auth",
      telemetryEventName: "local-debug",
    }),
  ])
  async provision(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    if (context.envInfo.envName === "local") {
      context.logProvider.info(Messages.StartLocalDebug.log);
      context.envInfo.state[ComponentNames.SimpleAuth] =
        context.envInfo.state[ComponentNames.SimpleAuth] || {};
      const simpleAuthFilePath = Utils.getSimpleAuthFilePath();
      context.envInfo.state[ComponentNames.SimpleAuth][
        LocalSettingsSimpleAuthKeys.SimpleAuthFilePath
      ] = simpleAuthFilePath;
      await Utils.downloadZip(simpleAuthFilePath);
      context.logProvider.info(Messages.EndLocalDebug.log);
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      errorSource: "sa",
      enableTelemetry: true,
      telemetryComponentName: "fx-resource-simple-auth",
      telemetryEventName: "configure",
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    context.logProvider.info(Messages.StartPostLocalDebug.log);
    context.envInfo.state[ComponentNames.SimpleAuth] =
      context.envInfo.state[ComponentNames.SimpleAuth] || {};
    const configs = this.getWebAppConfig(context.envInfo); //
    if (context.envInfo.envName === "local") {
      const configArray = [];
      for (const [key, value] of Object.entries(configs)) {
        configArray.push(`${key}="${value}"`);
      }
      context.envInfo.state[ComponentNames.SimpleAuth][
        LocalStateSimpleAuthKeys.EnvironmentVariableParams
      ] = configArray.join(" ");
      context.logProvider.info(Messages.EndPostLocalDebug.log);
    }
    return ok(undefined);
  }

  checkDefined(key: string, value: any, component = "simple-auth") {
    if (!value) {
      throw ResultFactory.SystemError(NoConfigError.name, NoConfigError.message(component, key));
    }
  }

  getWebAppConfig(envInfo: EnvInfoV3): { [propertyName: string]: string } {
    const clientId = envInfo.state[ComponentNames.AadApp].clientId;
    const clientSecret = envInfo.state[ComponentNames.AadApp].clientSecret;
    const oauthAuthority = envInfo.state[ComponentNames.AadApp].oauthAuthority;
    const applicationIdUris = envInfo.state[ComponentNames.AadApp].applicationIdUris;
    const endpoint = envInfo.state[ComponentNames.TeamsTab].endpoint as string;
    this.checkDefined("clientId", clientId);
    this.checkDefined("clientSecret", clientSecret);
    this.checkDefined("oauthAuthority", oauthAuthority);
    this.checkDefined("applicationIdUris", applicationIdUris);
    this.checkDefined("endpoint", endpoint, "teams-tab");
    const allowedAppIds = getAllowedAppIds().join(";");
    const aadMetadataAddress = `${oauthAuthority}/v2.0/.well-known/openid-configuration`;
    let endpointUrl;
    try {
      endpointUrl = new URL(endpoint);
    } catch (error: any) {
      throw ResultFactory.SystemError(
        EndpointInvalidError.name,
        EndpointInvalidError.message(endpoint, error.message)
      );
    }
    const tabAppEndpoint = endpointUrl.origin;
    return {
      [Constants.ApplicationSettingsKeys.clientId]: clientId,
      [Constants.ApplicationSettingsKeys.clientSecret]: clientSecret,
      [Constants.ApplicationSettingsKeys.oauthAuthority]: oauthAuthority,
      [Constants.ApplicationSettingsKeys.applicationIdUris]: applicationIdUris,
      [Constants.ApplicationSettingsKeys.allowedAppIds]: allowedAppIds,
      [Constants.ApplicationSettingsKeys.tabAppEndpoint]: tabAppEndpoint,
      [Constants.ApplicationSettingsKeys.aadMetadataAddress]: aadMetadataAddress,
    };
  }
}
