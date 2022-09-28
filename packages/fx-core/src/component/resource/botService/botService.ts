// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  ok,
  Result,
  ContextV3,
  InputsWithProjectPath,
  ResourceContextV3,
  v3,
  err,
  Effect,
  Bicep,
  ActionContext,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import {
  AppStudioScopes,
  compileHandlebarsTemplateString,
  GraphScopes,
} from "../../../common/tools";
import { CommonStrings, ConfigNames, PluginLocalDebug } from "./strings";
import * as uuid from "uuid";
import { ResourceNameFactory } from "./resourceNameFactory";
import { MaxLengths } from "./constants";
import { AADRegistration } from "./aadRegistration";
import { Messages } from "./messages";
import { IBotRegistration } from "./appStudio/interfaces/IBotRegistration";
import { AppStudio } from "./appStudio/appStudio";
import { BotServiceOutputs, ComponentNames } from "../../constants";
import { normalizeName } from "../../utils";
import { getComponent } from "../../workflow";
import { AzureResource } from "../azureResource";
import { Plans, ProgressMessages, ProgressTitles } from "../../messages";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { wrapError } from "./errors";
import { CheckThrowSomethingMissing } from "../../error";

const errorSource = "BotService";
function _checkThrowSomethingMissing<T>(key: string, value: T | undefined): T {
  return CheckThrowSomethingMissing(errorSource, key, value);
}
@Service("bot-service")
export class BotService extends AzureResource {
  outputs = BotServiceOutputs;
  finalOutputKeys = ["botId", "botPassword"];
  secretFields = ["botPassword"];
  readonly name = "bot-service";
  readonly bicepModuleName = "botService";
  async generateBicep(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<Bicep[], FxError>> {
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
  @hooks([
    ActionExecutionMW({
      enableProgressBar: true,
      progressTitle: ProgressTitles.provisionBot,
      progressSteps: 1,
      errorSource: errorSource,
      errorHandler: (e: Error) => {
        const res = wrapError(e);
        return res.isErr() ? res.error : (e as FxError);
      },
    }),
  ])
  async provision(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    // create bot aad app by API call
    await actionContext?.progressBar?.next(ProgressMessages.provisionBot);
    // init bot state
    context.envInfo.state[ComponentNames.TeamsBot] ||= {};
    const aadRes = await createBotAAD(context);
    if (aadRes.isErr()) return err(aadRes.error);
    if (context.envInfo.envName === "local") {
      const botConfig = aadRes.value;
      const regRes = await createBotRegInAppStudio(botConfig, context);
      if (regRes.isErr()) return err(regRes.error);
    }
    // Update states for bot aad configs.
    context.envInfo.state[ComponentNames.TeamsBot] = aadRes.value;
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      errorSource: errorSource,
      errorHandler: (e: Error) => {
        const res = wrapError(e);
        return res.isErr() ? res.error : (e as FxError);
      },
    }),
  ])
  async configure(context: ResourceContextV3): Promise<Result<undefined, FxError>> {
    // create bot aad app by API call
    const teamsBot = getComponent(context.projectSetting, ComponentNames.TeamsBot);
    if (!teamsBot) return ok(undefined);
    const plans: Effect[] = [];
    if (context.envInfo.envName === "local") {
      plans.push(Plans.updateBotEndpoint());
      const teamsBotState = context.envInfo.state[ComponentNames.TeamsBot];
      const appStudioTokenRes = await context.tokenProvider.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      const appStudioToken = appStudioTokenRes.isOk() ? appStudioTokenRes.value : undefined;
      _checkThrowSomethingMissing(ConfigNames.LOCAL_ENDPOINT, teamsBotState.siteEndpoint);
      _checkThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
      _checkThrowSomethingMissing(ConfigNames.LOCAL_BOT_ID, teamsBotState.botId);
      await AppStudio.updateMessageEndpoint(
        appStudioToken!,
        teamsBotState.botId,
        `${teamsBotState.siteEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`
      );
    }
    return ok(undefined);
  }
}

export async function createBotAAD(ctx: ResourceContextV3): Promise<Result<any, FxError>> {
  const graphTokenRes = await ctx.tokenProvider.m365TokenProvider.getAccessToken({
    scopes: GraphScopes,
  });
  const graphToken = graphTokenRes.isOk() ? graphTokenRes.value : undefined;
  _checkThrowSomethingMissing(ConfigNames.GRAPH_TOKEN, graphToken);
  _checkThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, ctx.projectSetting.appName);
  // Respect existing bot aad from config first, then states.
  const botConfig =
    ctx.envInfo.config.bot?.appId && ctx.envInfo.config.bot?.appPassword
      ? {
          botId: ctx.envInfo.config.bot?.appId,
          botPassword: ctx.envInfo.config.bot?.appPassword,
        }
      : ctx.envInfo.state[ComponentNames.TeamsBot];

  const botAADCreated = botConfig?.botId && botConfig?.botPassword;
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
  ctx: ResourceContextV3
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
  _checkThrowSomethingMissing(ConfigNames.APPSTUDIO_TOKEN, appStudioToken);
  await AppStudio.createBotRegistration(appStudioToken!, botReg, ctx.logProvider);
  ctx.logProvider.info(Messages.SuccessfullyProvisionedBotRegistration);
  return ok(undefined);
}
