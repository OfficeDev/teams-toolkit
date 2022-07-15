// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  Action,
  ContextV3,
  MaybePromise,
  InputsWithProjectPath,
  ProvisionContextV3,
  v3,
  err,
  AzureAccountProvider,
  Effect,
  IProgressHandler,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { AppStudioScopes, compileHandlebarsTemplateString, GraphScopes } from "../../common/tools";
import {
  CommonStrings,
  ConfigNames,
  PluginLocalDebug,
} from "../../plugins/resource/bot/resources/strings";
import { CheckThrowSomethingMissing, PreconditionError } from "../../plugins/resource/bot/v3/error";
import * as uuid from "uuid";
import { ResourceNameFactory } from "../../plugins/resource/bot/utils/resourceNameFactory";
import {
  AzureConstants,
  MaxLengths,
  ProgressBarConstants,
  TelemetryKeys,
} from "../../plugins/resource/bot/constants";
import { AADRegistration } from "../../plugins/resource/bot/aadRegistration";
import { Messages } from "../../plugins/resource/bot/resources/messages";
import { IBotRegistration } from "../../plugins/resource/bot/appStudio/interfaces/IBotRegistration";
import { AppStudio } from "../../plugins/resource/bot/appStudio/appStudio";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { ComponentNames } from "../constants";
import { normalizeName } from "../utils";
import { getComponent } from "../workflow";
import * as clientFactory from "../../plugins/resource/bot/clientFactory";
import { AzureResource } from "./azureResource";
import { telemetryHelper } from "../../plugins/resource/bot/utils/telemetry-helper";
@Service("bot-service")
export class BotService extends AzureResource {
  outputs = {
    botId: {
      key: "botId",
    },
    botPassword: {
      key: "botPassword",
    },
  };
  finalOutputKeys = ["botId", "botPassword"];
  secretFields = ["botPassword"];
  readonly name = "bot-service";
  readonly bicepModuleName = "botService";
  generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    try {
      const resource = Container.get(inputs.hosting) as AzureResource;
      this.templateContext.endpointVarName = compileHandlebarsTemplateString(
        resource.outputs.endpointAsParam.bicepVariable ?? "",
        inputs
      );
    } catch {}
    // Bot service's component must be Bot, omit it.
    inputs.scenario = "";
    return super.generateBicep(context, inputs);
  }
  provision(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-service.provision",
      type: "function",
      enableProgressBar: true,
      progressTitle: `Provision ${this.name}`,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryProps: commonTelemetryPropsForBot(context),
      telemetryComponentName: "fx-resource-bot",
      telemetryEventName: "provision",
      errorHandler: (e, t) => {
        telemetryHelper.fillAppStudioErrorProperty(e, t);
        return e as FxError;
      },
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const plans: Effect[] = [];
        if (ctx.envInfo.envName === "local") {
          plans.push({
            type: "service",
            name: "graph.microsoft.com",
            remarks: "create AAD app for bot service (botId, botPassword)",
          });
          plans.push({
            type: "service",
            name: "teams.microsoft.com",
            remarks: "create bot registration",
          });
        } else {
          plans.push({
            type: "service",
            name: "graph.microsoft.com",
            remarks: "create AAD app for bot service (botId, botPassword)",
          });
          plans.push({
            type: "service",
            name: "management.azure.com",
            remarks: "ensure resource providers for: " + AzureConstants.requiredResourceProviders,
          });
        }
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler,
        telemetryProps?: Record<string, string>
      ) => {
        // create bot aad app by API call
        await progress?.next(ProgressBarConstants.PROVISION_STEP_BOT_REG);
        const ctx = context as ProvisionContextV3;
        const plans: Effect[] = [];
        if (ctx.envInfo.envName === "local") {
          const aadRes = await createBotAAD(ctx);
          if (aadRes.isErr()) return err(aadRes.error);
          const botConfig = aadRes.value;
          const regRes = await createBotRegInAppStudio(botConfig, ctx);
          if (regRes.isErr()) return err(regRes.error);
          plans.push({
            type: "service",
            name: "graph.microsoft.com",
            remarks: "create AAD app for bot service (botId, botPassword)",
          });
          plans.push({
            type: "service",
            name: "teams.microsoft.com",
            remarks: "create bot registration",
          });
        } else {
          // Check Resource Provider
          const azureCredential = await getAzureAccountCredential(
            ctx.tokenProvider.azureAccountProvider
          );
          const solutionConfig = ctx.envInfo.state.solution as v3.AzureSolutionConfig;
          const rpClient = clientFactory.createResourceProviderClient(
            azureCredential,
            solutionConfig.subscriptionId!
          );
          await clientFactory.ensureResourceProvider(
            rpClient,
            AzureConstants.requiredResourceProviders
          );
          const aadRes = await createBotAAD(ctx);
          if (aadRes.isErr()) return err(aadRes.error);
          plans.push({
            type: "service",
            name: "management.azure.com",
            remarks: "ensure resource providers for: " + AzureConstants.requiredResourceProviders,
          });
          plans.push({
            type: "service",
            name: "graph.microsoft.com",
            remarks: "create AAD app for bot service (botId, botPassword)",
          });
        }
        return ok(plans);
      },
    };
    return ok(action);
  }
  configure(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: Action = {
      name: "bot-service.configure",
      type: "function",
      enableProgressBar: true,
      progressTitle: `Provision ${this.name}`,
      progressSteps: 1,
      enableTelemetry: true,
      telemetryProps: commonTelemetryPropsForBot(context),
      telemetryComponentName: "fx-resource-bot",
      telemetryEventName: "post-local-debug",
      errorHandler: (e, t) => {
        telemetryHelper.fillAppStudioErrorProperty(e, t);
        return e as FxError;
      },
      plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
        const ctx = context as ProvisionContextV3;
        const plans: Effect[] = [];
        if (ctx.envInfo.envName === "local") {
          plans.push({
            type: "service",
            name: "graph.microsoft.com",
            remarks: "update message endpoint in AppStudio",
          });
        }
        return ok(plans);
      },
      execute: async (
        context: ContextV3,
        inputs: InputsWithProjectPath,
        progress?: IProgressHandler,
        telemetryProps?: Record<string, string>
      ) => {
        // create bot aad app by API call
        const ctx = context as ProvisionContextV3;
        const teamsBot = getComponent(ctx.projectSetting, ComponentNames.TeamsBot);
        if (!teamsBot) return ok([]);
        const plans: Effect[] = [];
        if (ctx.envInfo.envName === "local") {
          plans.push({
            type: "service",
            name: "graph.microsoft.com",
            remarks: "update message endpoint in AppStudio",
          });
          const teamsBotState = ctx.envInfo.state[ComponentNames.TeamsBot];
          const appStudioTokenRes = await ctx.tokenProvider.m365TokenProvider.getAccessToken({
            scopes: AppStudioScopes,
          });
          const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
          CheckThrowSomethingMissing(ConfigNames.LOCAL_ENDPOINT, teamsBotState.endpoint);
          CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
          CheckThrowSomethingMissing(ConfigNames.LOCAL_BOT_ID, teamsBotState.botId);
          progress?.next("update message endpoint in app studio");
          await AppStudio.updateMessageEndpoint(
            appStudioToken!,
            teamsBotState.botId,
            `${teamsBotState.endpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`
          );
        }
        return ok(plans);
      },
    };
    return ok(action);
  }
}

export async function createBotAAD(ctx: ProvisionContextV3): Promise<Result<any, FxError>> {
  const graphTokenRes = await ctx.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: GraphScopes,
  });
  const graphToken = graphTokenRes.isOk() ? graphTokenRes.value : undefined;
  CheckThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, graphToken);
  CheckThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, ctx.projectSetting.appName);
  ctx.envInfo.state[ComponentNames.TeamsBot] = ctx.envInfo.state[ComponentNames.TeamsBot] || {};
  const botConfig = ctx.envInfo.state[ComponentNames.TeamsBot];
  const botAADCreated = botConfig?.botId !== undefined && botConfig?.botPassword !== undefined;
  if (!botAADCreated) {
    const solutionConfig = ctx.envInfo.state.solution as v3.AzureSolutionConfig;
    const resourceNameSuffix = solutionConfig.resourceNameSuffix
      ? solutionConfig.resourceNameSuffix
      : uuid.v4();
    const aadDisplayName = ResourceNameFactory.createCommonName(
      resourceNameSuffix,
      ctx.projectSetting.appName,
      MaxLengths.AAD_DISPLAY_NAME
    );
    const botAuthCredentials = await AADRegistration.registerAADAppAndGetSecretByGraph(
      graphToken!,
      aadDisplayName,
      botConfig.objectId,
      botConfig.botId
    );
    botConfig.botId = botAuthCredentials.clientId;
    botConfig.botPassword = botAuthCredentials.clientSecret;
    botConfig.objectId = botAuthCredentials.objectId;
    ctx.logProvider.info(Messages.SuccessfullyCreatedBotAadApp);
  }
  return ok(botConfig);
}

export async function createBotRegInAppStudio(
  botConfig: any,
  ctx: ProvisionContextV3
): Promise<Result<undefined, FxError>> {
  // 2. Register bot by app studio.
  const botReg: IBotRegistration = {
    botId: botConfig.botId,
    name: normalizeName(ctx.projectSetting.appName) + PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
    description: "",
    iconUrl: "",
    messagingEndpoint: "",
    callingEndpoint: "",
  };
  ctx.logProvider.info(Messages.ProvisioningBotRegistration);
  const appStudioTokenRes = await ctx.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: AppStudioScopes,
  });
  const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
  CheckThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
  await AppStudio.createBotRegistration(appStudioToken!, botReg);
  ctx.logProvider.info(Messages.SuccessfullyProvisionedBotRegistration);
  return ok(undefined);
}

export async function getAzureAccountCredential(
  tokenProvider: AzureAccountProvider
): Promise<TokenCredentialsBase> {
  const serviceClientCredentials = await tokenProvider.getAccountCredentialAsync();
  if (!serviceClientCredentials) {
    throw new PreconditionError(Messages.FailToGetAzureCreds, [Messages.TryLoginAzure]);
  }
  return serviceClientCredentials;
}

export function commonTelemetryPropsForBot(context: ContextV3): Record<string, string> {
  const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
  const props: Record<string, string> = {
    [TelemetryKeys.HostType]:
      teamsBot?.hosting === ComponentNames.Function ? "azure-function" : "app-service",
    [TelemetryKeys.BotCapabilities]: teamsBot?.capabilities
      ? JSON.stringify(teamsBot.capabilities)
      : "",
  };
  return props;
}
