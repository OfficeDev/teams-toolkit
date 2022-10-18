// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { StepDriver } from "../interface/stepDriver";
import { DriverContext } from "../interface/commonArgs";
import { Service } from "typedi";
import { CreateBotAadAppArgs } from "./interface/createBotAadAppArgs";
import { CreateBotAadAppOutput } from "./interface/createBotAadAppOutput";
import { err, FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UnhandledSystemError, UnhandledUserError } from "./error/unhandledError";
import axios from "axios";
import { wrapRun } from "../../utils/common";
import {
  BotRegistration,
  IBotAadCredentials,
} from "../../resource/botService/botRegistration/botRegistration";
import { RemoteBotRegistration } from "../../resource/botService/botRegistration/remoteBotRegistration";

const actionName = "botAadApp/create"; // DO NOT MODIFY the name
const helpLink = "https://aka.ms/teamsfx-actions/botaadapp-create";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateBotAadAppDriver implements StepDriver {
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
    try {
      this.validateArgs(args);
      const botAadAppState = this.loadCurrentState();
      const botConfig: IBotAadCredentials = {
        botId: botAadAppState.BOT_ID ?? "",
        botPassword: botAadAppState.BOT_PASSWORD ?? "",
      };
      const botRegistration: BotRegistration = new RemoteBotRegistration();
      const createRes = await botRegistration.createBotRegistration(
        context.m365TokenProvider,
        args.name,
        botConfig
      );
      if (createRes.isErr()) {
        throw err(createRes.error);
      }

      return new Map([
        ["BOT_ID", createRes.value.botId],
        ["BOT_PASSWORD", createRes.value.botPassword],
      ]);
    } catch (error) {
      if (error instanceof UserError || error instanceof SystemError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.response!.status >= 400 && error.response!.status < 500) {
          throw new UnhandledUserError(actionName, JSON.stringify(error.response!.data), helpLink);
        } else {
          throw new UnhandledSystemError(actionName, JSON.stringify(error.response!.data));
        }
      }

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
      BOT_ID: process.env.BOT_ID,
      BOT_PASSWORD: process.env.BOT_PASSWORD,
    };
  }
}
