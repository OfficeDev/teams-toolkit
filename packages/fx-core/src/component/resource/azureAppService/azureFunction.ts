// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { getComponentByScenario } from "../../workflow";
import {
  APIMOutputs,
  ComponentNames,
  FunctionAppSetting,
  FunctionOutputs,
  IdentityOutputs,
  Scenarios,
} from "../../constants";
import { AzureAppService } from "./azureAppService";
import { CheckThrowSomethingMissing, FindFunctionAppError } from "../../error";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../common/tools";
import { NameValuePair, Site } from "@azure/arm-appservice";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { LogMessages } from "../../messages";
import { AzureClientFactory } from "./azureLibs";

const ErrorSource = "Functions";
@Service("azure-function")
export class AzureFunctionResource extends AzureAppService {
  readonly name = "azure-function";
  readonly alias = ErrorSource;
  readonly displayName = "Azure Functions";
  readonly bicepModuleName = "azureFunction";
  outputs = FunctionOutputs;
  finalOutputKeys = ["resourceId", "endpoint"];
  templateContext = {
    identity: {
      resourceId: IdentityOutputs.identityResourceId.bicepVariable,
    },
  };
  @hooks([
    ActionExecutionMW({
      errorSource: ErrorSource,
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    if (!this.needConfigure(context)) {
      return ok(undefined);
    }
    context.logProvider.info(LogMessages.updateFunctionAppSettings);
    const resourceId = CheckThrowSomethingMissing(
      this.alias,
      "resourceId",
      context.envInfo.state[ComponentNames.TeamsApi]?.[FunctionOutputs.resourceId.key]
    );
    const credentials = CheckThrowSomethingMissing(
      this.alias,
      "Azure account",
      await context.tokenProvider.azureAccountProvider.getIdentityCredentialAsync()
    );
    const resourceGroupName = getResourceGroupNameFromResourceId(resourceId);
    const functionAppName = getSiteNameFromResourceId(resourceId);
    const subscriptionId = getSubscriptionIdFromResourceId(resourceId);

    const client = AzureClientFactory.getWebSiteManagementClient(credentials, subscriptionId);
    let site: Site | undefined = undefined;
    for await (const page of client.webApps.listByResourceGroup(resourceGroupName).byPage()) {
      for (const webApp of page) {
        if (webApp.name === functionAppName) {
          site = webApp;
        }
      }
    }
    if (!site) {
      throw new FindFunctionAppError(this.alias);
    }
    const settings = await client.webApps.listApplicationSettings(
      resourceGroupName,
      functionAppName
    );
    if (settings?.properties) {
      Object.entries(settings.properties).forEach((kv: [string, string]) => {
        this.pushAppSettings(site!, kv[0], kv[1], false);
      });
    }
    this.collectFunctionAppSettings(context, site);
    await client.webApps.update(resourceGroupName, functionAppName, site);

    return ok(undefined);
  }

  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    let resourceIdKey = this.outputs.resourceId.key;
    if (inputs.componentId === ComponentNames.TeamsBot) {
      const state = context.envInfo.state[inputs.componentId];
      if (!state[resourceIdKey]) {
        if (state["resourceId"]) {
          resourceIdKey = "resourceId";
        } else if (state["botWebAppResourceId"]) {
          resourceIdKey = "botWebAppResourceId";
        }
      }
    }
    return await super.deploy(context, inputs, true, resourceIdKey);
  }

  private needConfigure(context: ResourceContextV3): boolean {
    const func = getComponentByScenario(
      context.projectSetting,
      ComponentNames.Function,
      Scenarios.Api
    );
    return (
      context.envInfo.envName !== "local" && !!func?.connections?.includes(ComponentNames.APIM)
    );
  }

  private collectFunctionAppSettings(ctx: ResourceContextV3, site: Site): void {
    const apimConfig = ctx.envInfo.state[ComponentNames.APIM];
    if (apimConfig) {
      // Logger.info(InfoMessages.dependPluginDetected(ComponentNames.APIM));

      const clientId: string = CheckThrowSomethingMissing(
        this.alias,
        "APIM app Id",
        apimConfig[APIMOutputs.apimClientAADClientId.key]
      );

      this.ensureFunctionAllowAppIds(site, [clientId]);
    }
  }

  public ensureFunctionAllowAppIds(site: Site, clientIds: string[]): void {
    if (!site.siteConfig) {
      site.siteConfig = {};
    }

    const rawOldClientIds: string | undefined = site.siteConfig.appSettings?.find(
      (kv: NameValuePair) => kv.name === FunctionAppSetting.keys.allowedAppIds
    )?.value;
    const oldClientIds: string[] = rawOldClientIds
      ? rawOldClientIds.split(FunctionAppSetting.allowedAppIdSep).filter((e) => e)
      : [];

    for (const id of oldClientIds) {
      if (!clientIds.includes(id)) {
        clientIds.push(id);
      }
    }

    this.pushAppSettings(
      site,
      FunctionAppSetting.keys.allowedAppIds,
      clientIds.join(FunctionAppSetting.allowedAppIdSep),
      true
    );
  }

  private pushAppSettings(site: Site, newName: string, newValue: string, replace = true): void {
    if (!site.siteConfig) {
      site.siteConfig = {};
    }

    if (!site.siteConfig.appSettings) {
      site.siteConfig.appSettings = [];
    }

    const kv: NameValuePair | undefined = site.siteConfig.appSettings.find(
      (kv) => kv.name === newName
    );
    if (!kv) {
      site.siteConfig.appSettings.push({
        name: newName,
        value: newValue,
      });
    } else if (replace) {
      kv.value = newValue;
    }
  }
}
