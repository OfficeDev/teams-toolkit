// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { CreateBotAadAppArgs } from "./interface/createBotAadAppArgs";
import { CreateBotAadAppOutput } from "./interface/createBotAadAppOutput";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
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

const actionName = "botAadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/botaadapp-create";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateBotAadAppDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateBotAadAppArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.handler(args, context));
  }

  public async handler(
    args: CreateBotAadAppArgs,
    context: DriverContext
  ): Promise<Map<string, string>> {
    const progressHandler = context.ui?.createProgressBar(
      getLocalizedString(progressBarKeys.creatingBotAadApp),
      1
    );
    await progressHandler?.start();
    try {
      context.logProvider?.info(getLocalizedString(logMessageKeys.startExecuteDriver, actionName));
      this.validateArgs(args);
      const botAadAppState = this.loadCurrentState();
      const botConfig: BotAadCredentials = {
        botId: botAadAppState.MICROSOFT_APP_ID ?? "",
        botPassword: botAadAppState.SECRET_MICROSOFT_APP_PASSWORD ?? "",
      };
      const botRegistration: BotRegistration = new RemoteBotRegistration();

      await progressHandler?.next(getLocalizedString(progressBarKeys.creatingBotAadApp));
      const createRes = await botRegistration.createBotRegistration(
        context.m365TokenProvider,
        args.name,
        args.name,
        botConfig,
        undefined, // Use default value of BotAuthType.AADApp
        context.logProvider
      );
      if (createRes.isErr()) {
        throw createRes.error;
      }

      await progressHandler?.end(true);
      context.logProvider?.info(
        getLocalizedString(logMessageKeys.successExecuteDriver, actionName)
      );
      return new Map([
        ["MICROSOFT_APP_ID", createRes.value.botId],
        ["SECRET_MICROSOFT_APP_PASSWORD", createRes.value.botPassword],
      ]);
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

  private loadCurrentState(): CreateBotAadAppOutput {
    return {
      MICROSOFT_APP_ID: process.env.MICROSOFT_APP_ID,
      SECRET_MICROSOFT_APP_PASSWORD: process.env.SECRET_MICROSOFT_APP_PASSWORD,
    };
  }
}
