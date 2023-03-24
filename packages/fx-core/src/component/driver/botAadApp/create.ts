// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { CreateBotAadAppArgs } from "./interface/createBotAadAppArgs";
import { CreateBotAadAppOutput } from "./interface/createBotAadAppOutput";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
import { performance } from "perf_hooks";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UnhandledSystemError, UnhandledUserError } from "./error/unhandledError";
import axios from "axios";
import { wrapRun } from "../../utils/common";
import {
  BotRegistration,
  BotAadCredentials,
} from "../../resource/botService/botRegistration/botRegistration";
import { RemoteBotRegistration } from "../../resource/botService/botRegistration/remoteBotRegistration";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { logMessageKeys } from "./utility/constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { progressBarKeys } from "../../resource/botService/botRegistration/constants";
import { loadStateFromEnv, mapStateToEnv } from "../util/utils";

const actionName = "botAadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/botaadapp-create";

const successRegisterBotAad = `${actionName}/success`;
const propertyKeys = {
  reusingExistingBotAad: "reuse-existing-bot-aad",
  registerBotAadTime: "register-bot-aad-time",
};

const defaultOutputEnvVarNames = {
  botId: "BOT_ID",
  botPassword: "SECRET_BOT_PASSWORD",
};

@Service(actionName) // DO NOT MODIFY the service name
export class CreateBotAadAppDriver implements StepDriver {
  readonly description?: string | undefined = getLocalizedString(
    "driver.botAadApp.create.description"
  );
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateBotAadAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    });
  }

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async execute(
    args: CreateBotAadAppArgs,
    ctx: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<ExecutionResult> {
    let summaries: string[] = [];
    const outputResult = await wrapRun(async () => {
      const result = await this.handler(args, ctx, outputEnvVarNames);
      summaries = result.summaries;
      return result.output;
    });
    return {
      result: outputResult,
      summaries,
    };
  }

  public async handler(
    args: CreateBotAadAppArgs,
    context: DriverContext,
    outputEnvVarNames?: Map<string, string>
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    const progressHandler = context.ui?.createProgressBar(
      getLocalizedString(progressBarKeys.creatingBotAadApp),
      1
    );
    await progressHandler?.start();
    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));
      this.validateArgs(args);
      // TODO: Remove this logic when config manager forces schema validation
      if (!outputEnvVarNames) {
        outputEnvVarNames = new Map(Object.entries(defaultOutputEnvVarNames));
      }
      const botAadAppState: CreateBotAadAppOutput = loadStateFromEnv(outputEnvVarNames);
      const botConfig: BotAadCredentials = {
        botId: botAadAppState.botId ?? "",
        botPassword: botAadAppState.botPassword ?? "",
      };
      const botRegistration: BotRegistration = new RemoteBotRegistration();

      await progressHandler?.next(getLocalizedString(progressBarKeys.creatingBotAadApp));
      const startTime = performance.now();
      const createRes = await botRegistration.createBotRegistration(
        context.m365TokenProvider,
        args.name,
        args.name,
        botConfig,
        context.logProvider
      );
      const durationMilliSeconds = performance.now() - startTime;
      if (createRes.isErr()) {
        throw createRes.error;
      }
      botAadAppState.botId = createRes.value.botId;
      botAadAppState.botPassword = createRes.value.botPassword;
      const outputs = mapStateToEnv(botAadAppState, outputEnvVarNames);
      const isReusingExisting = !(!botConfig.botId || !botConfig.botPassword);
      const successCreateBotAadLog = getLocalizedString(
        logMessageKeys.successCreateBotAad,
        createRes.value.botId
      );
      const useExistingBotAadLog = getLocalizedString(
        logMessageKeys.useExistingBotAad,
        botConfig.botId
      );
      const summary = isReusingExisting ? useExistingBotAadLog : successCreateBotAadLog;
      context.logProvider?.info(summary);
      await progressHandler?.end(true);
      context.logProvider?.info(
        getLocalizedString(logMessageKeys.successExecuteDriver, actionName)
      );
      context.telemetryReporter.sendTelemetryEvent(successRegisterBotAad, {
        [propertyKeys.reusingExistingBotAad]: isReusingExisting.toString(),
        [propertyKeys.registerBotAadTime]: durationMilliSeconds.toString(),
      });
      return {
        output: outputs,
        summaries: [summary],
      };
    } catch (error) {
      await progressHandler?.end(false);
      if (error instanceof UserError || error instanceof SystemError) {
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, error.displayMessage)
        );
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const message = JSON.stringify(error.response?.data);
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
        );
        if (error.response!.status >= 400 && error.response!.status < 500) {
          throw new UnhandledUserError(actionName, JSON.stringify(error.response!.data), helpLink);
        } else {
          throw new UnhandledSystemError(actionName, JSON.stringify(error.response!.data));
        }
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
      );
      throw new UnhandledSystemError(actionName, JSON.stringify(error));
    }
  }

  private validateArgs(args: CreateBotAadAppArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.name !== "string" || !args.name) {
      invalidParameters.push("name");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }
}
