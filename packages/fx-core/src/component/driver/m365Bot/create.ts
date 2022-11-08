// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { AppStudioScopes } from "../../../common/tools";
import { AppStudioClient } from "../../resource/botService/appStudio/appStudioClient";
import { IBotRegistration } from "../../resource/botService/appStudio/interfaces/IBotRegistration";
import { wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UnhandledSystemError } from "./error/unhandledError";
import { CreateM365BotArgs } from "./interface/createM365BotArgs";

const actionName = "m365Bot/create";
const helpLink = "https://aka.ms/teamsfx-actions/m365Bot-create";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateM365BotDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateM365BotArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.handler(args, context));
  }

  private async handler(
    args: CreateM365BotArgs,
    context: DriverContext
  ): Promise<Map<string, string>> {
    try {
      this.validateArgs(args);

      const tokenResult = await context.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (tokenResult.isErr()) {
        throw tokenResult.error;
      }

      const botRegistration: IBotRegistration = {
        botId: args.botId,
        name: args.name,
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      };
      await AppStudioClient.createBotRegistration(tokenResult.value, botRegistration, false);

      return new Map();
    } catch (error) {
      if (error instanceof UserError || error instanceof SystemError) {
        context.logProvider?.error(
          getLocalizedString(logMessageKeys.failExecuteDriver, actionName, error.displayMessage)
        );
        throw error;
      }

      const message = JSON.stringify(error);
      context.logProvider?.error(
        getLocalizedString(logMessageKeys.failExecuteDriver, actionName, message)
      );
      throw new UnhandledSystemError(actionName, message);
    }
  }

  private validateArgs(args: CreateM365BotArgs): void {
    const invalidParameters: string[] = [];
    if (!args.name || typeof args.name !== "string") {
      invalidParameters.push("name");
    }

    if (!args.botId || typeof args.botId !== "string") {
      invalidParameters.push("botId");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }
}
