// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan He <ruhe@microsoft.com>
 */
import {
  FxError,
  ok,
  Result,
  ContextV3,
  InputsWithProjectPath,
  ResourceContextV3,
  v3,
  err,
  Bicep,
  ActionContext,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { compileHandlebarsTemplateString } from "../../../common/tools";
import { BotServiceOutputs, ComponentNames } from "../../constants";
import { getComponent } from "../../workflow";
import { AzureResource } from "../azureResource";
import { ProgressMessages, ProgressTitles } from "../../messages";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { AlreadyCreatedBotNotExist, wrapError } from "./errors";
import { CheckThrowSomethingMissing } from "../../error";
import { BotRegistration, BotAadCredentials } from "./botRegistration/botRegistration";
import * as uuid from "uuid";
import { ResourceNameFactory } from "./resourceNameFactory";
import { ErrorNames, MaxLengths, TeamsFxUrlNames } from "./constants";
import { CommonStrings, PluginLocalDebug } from "./strings";
import { BotRegistrationFactory, BotRegistrationKind } from "./botRegistration/factory";
import { normalizeName } from "../../utils";
import { APP_STUDIO_API_NAMES } from "../appManifest/constants";

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
    const teamsBotState = context.envInfo.state[ComponentNames.TeamsBot];
    const hasBotIdInEnvBefore = !!teamsBotState && !!teamsBotState.botId;

    const botRegistration: BotRegistration = BotRegistrationFactory.create(
      context.envInfo.envName === "local" ? BotRegistrationKind.Local : BotRegistrationKind.Remote
    );

    const solutionConfig = context.envInfo.state.solution as v3.AzureSolutionConfig;
    const resourceNameSuffix = solutionConfig.resourceNameSuffix
      ? solutionConfig.resourceNameSuffix
      : uuid.v4();
    _checkThrowSomethingMissing(CommonStrings.SHORT_APP_NAME, context.projectSetting.appName);
    const aadDisplayName = ResourceNameFactory.createCommonName(
      resourceNameSuffix,
      context.projectSetting.appName,
      MaxLengths.AAD_DISPLAY_NAME
    );
    const botName =
      normalizeName(context.projectSetting.appName!) + PluginLocalDebug.LOCAL_DEBUG_SUFFIX;
    const botConfig: BotAadCredentials =
      context.envInfo.config.bot?.appId && context.envInfo.config.bot?.appPassword
        ? {
            botId: context.envInfo.config.bot?.appId,
            botPassword: context.envInfo.config.bot?.appPassword,
          }
        : {
            botId: teamsBotState.botId,
            botPassword: teamsBotState.botPassword,
          };

    try {
      const regRes = await botRegistration.createBotRegistration(
        context.tokenProvider.m365TokenProvider,
        aadDisplayName,
        botName,
        botConfig,
        context.logProvider
      );
      if (regRes.isErr()) return err(regRes.error);

      // Update states for bot aad configs.
      teamsBotState.botId = regRes.value.botId;
      teamsBotState.botPassword = regRes.value.botPassword;
      return ok(undefined);
    } catch (e) {
      if (
        e.innerError?.teamsfxUrlName == TeamsFxUrlNames[APP_STUDIO_API_NAMES.CREATE_BOT] &&
        hasBotIdInEnvBefore
      ) {
        throw AlreadyCreatedBotNotExist(botConfig.botId, (e as any).innerError);
      } else {
        throw e;
      }
    }
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

    const botRegistration: BotRegistration = BotRegistrationFactory.create(
      context.envInfo.envName === "local" ? BotRegistrationKind.Local : BotRegistrationKind.Remote
    );

    const teamsBotState = context.envInfo.state[ComponentNames.TeamsBot];

    const updateRes = await botRegistration.updateMessageEndpoint(
      context.tokenProvider.m365TokenProvider,
      teamsBotState.botId,
      `${teamsBotState.siteEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`
    );
    if (updateRes.isErr()) return err(updateRes.error);

    return ok(undefined);
  }
}
