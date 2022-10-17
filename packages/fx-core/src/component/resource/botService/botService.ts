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
import { Messages } from "./messages";
import { IBotRegistration } from "./appStudio/interfaces/IBotRegistration";
import { BotServiceOutputs, ComponentNames } from "../../constants";
import { normalizeName } from "../../utils";
import { getComponent } from "../../workflow";
import { AzureResource } from "../azureResource";
import { Plans, ProgressMessages, ProgressTitles } from "../../messages";
import { hooks } from "@feathersjs/hooks/lib";
import { ActionExecutionMW } from "../../middleware/actionExecutionMW";
import { wrapError } from "./errors";
import { CheckThrowSomethingMissing } from "../../error";
import { LocalBotEndpointNotConfigured } from "../../../plugins/solution/fx-solution/debug/error";
import { LocalBotRegistration } from "./botRegistration/localBotRegistration";
import { RemoteBotRegistration } from "./botRegistration/remoteBotRegistration";
import { BotRegistration } from "./botRegistration/botRegistration";

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

    let botRegistration: BotRegistration | undefined = undefined;
    if (context.envInfo.envName === "local") {
      botRegistration = new LocalBotRegistration();
    } else {
      botRegistration = new RemoteBotRegistration();
    }

    const regRes = await botRegistration.createBotRegistration(context);
    if (regRes.isErr()) return err(regRes.error);

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

    let botRegistration: BotRegistration | undefined = undefined;
    // const plans: Effect[] = [Plans.updateBotEndpoint()];
    if (context.envInfo.envName === "local") {
      botRegistration = new LocalBotRegistration();
    } else {
      botRegistration = new RemoteBotRegistration();
    }
    const updateRes = await botRegistration.updateMessageEndpoint(context);
    if (updateRes.isErr()) return err(updateRes.error);
    return ok(undefined);
  }
}
