// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { CreateBotAadAppArgs } from "./interface/createBotAadAppArgs";
import { CreateBotAadAppOutput } from "./interface/createBotAadAppOutput";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
import { performance } from "perf_hooks";
import axios from "axios";
import { wrapRun } from "../../utils/common";
import { hooks } from "@feathersjs/hooks/lib";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { logMessageKeys, progressBarKeys } from "./utility/constants";
import { getLocalizedString } from "../../../common/localizeUtils";
import { loadStateFromEnv, mapStateToEnv } from "../util/utils";
import { UnexpectedEmptyBotPasswordError } from "./error/unexpectedEmptyBotPasswordError";
import {
  HttpClientError,
  HttpServerError,
  InvalidActionInputError,
  UnhandledError,
  UnhandledUserError,
} from "../../../error/common";
import { OutputEnvironmentVariableUndefinedError } from "../error/outputEnvironmentVariableUndefinedError";
import { AadAppClient } from "../aad/utility/aadAppClient";
import { SignInAudience } from "../aad/interface/signInAudience";

const actionName = "botAadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/botaadapp-create";

const successRegisterBotAad = `${actionName}/success`;
const propertyKeys = {
  reusingExistingBotAad: "reuse-existing-bot-aad",
  registerBotAadTime: "register-bot-aad-time",
};

@Service(actionName) // DO NOT MODIFY the service name
export class CreateBotAadAppDriver implements StepDriver {
  readonly description?: string | undefined = getLocalizedString(
    "driver.botAadApp.create.description"
  );
  readonly progressTitle = getLocalizedString(progressBarKeys.creatingBotAadApp);

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateBotAadAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    }, actionName);
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
    }, actionName);
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
    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));

      this.validateArgs(args);
      if (!outputEnvVarNames) {
        throw new OutputEnvironmentVariableUndefinedError(actionName);
      }
      const aadAppClient = new AadAppClient(context.m365TokenProvider);
      const botAadAppState: CreateBotAadAppOutput = loadStateFromEnv(outputEnvVarNames);
      const isReusingExisting = !(!botAadAppState.botId || !botAadAppState.botPassword);

      // If it's the case of a valid bot id with an empty bot password, then throw an error
      if (botAadAppState.botId && !botAadAppState.botPassword) {
        throw new UnexpectedEmptyBotPasswordError(actionName, helpLink);
      }

      const startTime = performance.now();
      if (!botAadAppState.botId) {
        context.logProvider?.info(getLocalizedString(logMessageKeys.startCreateBotAadApp));
        const aadApp = await aadAppClient.createAadApp(
          args.name,
          SignInAudience.AzureADMultipleOrgs
        );
        botAadAppState.botId = aadApp.appId!;
        botAadAppState.botPassword = await aadAppClient.generateClientSecret(aadApp.id!);
        context.logProvider?.info(getLocalizedString(logMessageKeys.successCreateBotAadApp));
      } else {
        context.logProvider?.info(getLocalizedString(logMessageKeys.skipCreateBotAadApp));
      }
      const durationMilliSeconds = performance.now() - startTime;

      const outputs = mapStateToEnv(botAadAppState, outputEnvVarNames);

      const successCreateBotAadLog = getLocalizedString(
        logMessageKeys.successCreateBotAad,
        botAadAppState.botId
      );
      const useExistingBotAadLog = getLocalizedString(
        logMessageKeys.useExistingBotAad,
        botAadAppState.botId
      );
      const summary = isReusingExisting ? useExistingBotAadLog : successCreateBotAadLog;
      context.logProvider?.info(summary);
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
    } catch (error: any) {
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
          throw new HttpClientError(actionName, message, helpLink);
        } else {
          throw new HttpServerError(actionName, message);
        }
      }

      if (error.name === "AadCreateAppError") {
        throw new UnhandledUserError(new Error(error.details[0]), actionName);
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
      );
      throw new UnhandledError(error as Error, actionName);
    }
  }

  private validateArgs(args: CreateBotAadAppArgs): void {
    const invalidParameters: string[] = [];
    if (typeof args.name !== "string" || !args.name) {
      invalidParameters.push("name");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }
}
