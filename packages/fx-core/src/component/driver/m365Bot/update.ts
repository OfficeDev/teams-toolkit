// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { AppStudioScopes } from "../../../common/tools";
import { AppStudioClient } from "../../resource/botService/appStudio/appStudioClient";
import { wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { BotRegistrationNotFoundError } from "./error/botRegistrationNotFoundError";
import { InvalidParameterUserError } from "./error/invalidParameterUserError";
import { UnhandledSystemError } from "./error/unhandledError";
import { UpdateM365BotArgs } from "./interface/updateM365BotArgs";

const actionName = "m365Bot/update";
const helpLink = "https://aka.ms/teamsfx-actions/m365Bot-update";

@Service(actionName) // DO NOT MODIFY the service name
export class UpdateM365BotDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: UpdateM365BotArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(() => this.handler(args, context));
  }

  private async handler(
    args: UpdateM365BotArgs,
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

      const botRegistration = await AppStudioClient.getBotRegistration(
        tokenResult.value,
        args.botId
      );
      if (!botRegistration) {
        throw new BotRegistrationNotFoundError(actionName, args.botId);
      }

      botRegistration.messagingEndpoint = args.messagingEndpoint;
      botRegistration.name = args.name ?? botRegistration.name;
      botRegistration.description = args.description ?? botRegistration.description;
      botRegistration.iconUrl = args.iconUrl ?? botRegistration.iconUrl;

      await AppStudioClient.updateBotRegistration(tokenResult.value, botRegistration);

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

  private validateArgs(args: UpdateM365BotArgs): void {
    const invalidParameters: string[] = [];

    if (!args.botId || typeof args.botId !== "string") {
      invalidParameters.push("botId");
    }

    if (!args.messagingEndpoint || typeof args.messagingEndpoint !== "string") {
      invalidParameters.push("messagingEndpoint");
    }

    if (args.name && typeof args.name !== "string") {
      invalidParameters.push("name");
    }

    if (args.description && typeof args.description !== "string") {
      invalidParameters.push("description");
    }

    if (args.iconUrl && typeof args.iconUrl !== "string") {
      invalidParameters.push("iconUrl");
    }

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(actionName, invalidParameters, helpLink);
    }
  }
}
