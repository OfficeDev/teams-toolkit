// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { WebSiteManagementClient } from "@azure/arm-appservice";
import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import {
  getResourceGroupNameFromResourceId,
  getSiteNameFromResourceId,
  getSubscriptionIdFromResourceId,
} from "../../../common/tools";
import { runWithErrorCatchAndThrow } from "../../../plugins/resource/function/resources/errors";
import {
  InitAzureSDKError,
  FetchConfigError,
  FindAppError,
  ConfigFunctionAppError,
} from "../../../plugins/resource/function/v3/error";
import { PostProvisionSteps, StepGroup } from "../../../plugins/resource/function/resources/steps";
import {
  AzureClientFactory,
  AzureLib,
} from "../../../plugins/resource/function/utils/azure-client";
import { ComponentNames, FunctionOutputs, IdentityOutputs, Scenarios } from "../../constants";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { getComponent, getComponentByScenario } from "../../workflow";
import { AzureAppService } from "./azureAppService";
import { Site, StringDictionary } from "@azure/arm-appservice/esm/models";
import { FunctionProvision } from "../../../plugins/resource/function/ops/provision";
import { InfoMessages } from "../../../plugins/resource/function/resources/message";
@Service("azure-function")
export class AzureFunctionResource extends AzureAppService {
  readonly name = "azure-function";
  readonly alias = "Functions";
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
      enableProgressBar: true,
      progressTitle: StepGroup.PostProvisionStepGroup,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryEventName: "post-provision",
      telemetryComponentName: "fx-resource-function",
      errorSource: "BE",
    }),
  ])
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const apiConfig = getComponentByScenario(
      context.projectSetting,
      ComponentNames.Function,
      Scenarios.Api
    );
    // no api, return
    if (apiConfig === undefined) {
      return ok(undefined);
    }
    // no apim, return
    if (!getComponent(context.projectSetting, ComponentNames.APIM)) {
      return ok(undefined);
    }
    const functionState = context.envInfo.state[ComponentNames.TeamsApi];
    const resourceId = this.checkAndGet(
      functionState[this.outputs.resourceId.key],
      this.outputs.resourceId.key
    );

    const functionAppName = getSiteNameFromResourceId(resourceId);
    const resourceGroupName = getResourceGroupNameFromResourceId(resourceId);
    const subscriptionId = getSubscriptionIdFromResourceId(resourceId);
    const credential = this.checkAndGet(
      await context.tokenProvider.azureAccountProvider.getAccountCredentialAsync(),
      "credential"
    );

    const webSiteManagementClient: WebSiteManagementClient = await runWithErrorCatchAndThrow(
      new InitAzureSDKError(),
      () => AzureClientFactory.getWebSiteManagementClient(credential, subscriptionId)
    );

    const site = await this.getSite(webSiteManagementClient, resourceGroupName, functionAppName);

    // We must query app settings from azure here, for two reasons:
    // 1. The site object returned by SDK may not contain app settings.
    // 2. Azure automatically added some app settings during creation.
    const res: StringDictionary = await runWithErrorCatchAndThrow(
      new ConfigFunctionAppError(),
      async () =>
        await webSiteManagementClient.webApps.listApplicationSettings(
          resourceGroupName,
          functionAppName
        )
    );

    if (res.properties) {
      Object.entries(res.properties).forEach((kv: [string, string]) => {
        // The site have some settings added in provision step,
        // which should not be overwritten by queried settings.
        FunctionProvision.pushAppSettings(site, kv[0], kv[1], false);
      });
    }
    const apimState = context.envInfo.state[ComponentNames.APIM];
    context.logProvider.info(InfoMessages.dependPluginDetected(ComponentNames.APIM));
    const clientId: string = this.checkAndGet(apimState.apimClientAADClientId, "APIM app Id");
    FunctionProvision.ensureFunctionAllowAppIds(site, [clientId]);
    actionContext?.progressBar?.next(PostProvisionSteps.updateFunctionSettings);
    await runWithErrorCatchAndThrow(
      new ConfigFunctionAppError(),
      async () =>
        await webSiteManagementClient.webApps.update(resourceGroupName, functionAppName, site)
    );
    context.logProvider.info(InfoMessages.functionAppSettingsUpdated);
    return ok(undefined);
  }

  private checkAndGet<T>(v: T | undefined, key: string): T {
    if (v) {
      return v;
    }
    throw new FetchConfigError(key);
  }
  private async getSite(
    client: WebSiteManagementClient,
    resourceGroupName: string,
    functionAppName: string
  ): Promise<Site> {
    const site = await AzureLib.findFunctionApp(client, resourceGroupName, functionAppName);
    if (!site) {
      throw new FindAppError();
    } else {
      return site;
    }
  }
}
