// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Service } from "typedi";

import { hooks } from "@feathersjs/hooks/lib";
import { FxError, Result, SystemError, UserError } from "@microsoft/teamsfx-api";

import { getLocalizedString } from "../../../common/localizeUtils";
import { wrapRun } from "../../utils/common";
import { logMessageKeys } from "../aad/utility/constants";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";
import { addStartAndEndTelemetry } from "../middleware/addStartAndEndTelemetry";
import { UnhandledSystemError } from "./error/unhandledError";
import {
  CreateOrUpdateBotFrameworkBotArgs,
  MicrosoftTeamsChannelSettings,
} from "./interface/createOrUpdateBotFrameworkBotArgs";
import { BotRegistration } from "../../resource/botService/botRegistration/botRegistration";
import { LocalBotRegistration } from "../../resource/botService/botRegistration/localBotRegistration";
import {
  BotChannelType,
  IBotRegistration,
} from "../../resource/botService/appStudio/interfaces/IBotRegistration";
import { InvalidActionInputError } from "../../../error/common";

const actionName = "botFramework/create";
const helpLink = "https://aka.ms/teamsfx-actions/botFramework-create";

const botUrl = "https://dev.botframework.com/bots?id=";

@Service(actionName) // DO NOT MODIFY the service name
export class CreateOrUpdateBotFrameworkBotDriver implements StepDriver {
  description = getLocalizedString("driver.botFramework.description");

  @hooks([addStartAndEndTelemetry(actionName, actionName)])
  public async run(
    args: CreateOrUpdateBotFrameworkBotArgs,
    context: DriverContext
  ): Promise<Result<Map<string, string>, FxError>> {
    return wrapRun(async () => {
      const result = await this.handler(args, context);
      return result.output;
    });
  }

  public async execute(
    args: CreateOrUpdateBotFrameworkBotArgs,
    ctx: DriverContext
  ): Promise<ExecutionResult> {
    let summaries: string[] = [];
    const outputResult = await wrapRun(async () => {
      const result = await this.handler(args, ctx);
      summaries = result.summaries;
      return result.output;
    });
    return {
      result: outputResult,
      summaries,
    };
  }

  private async handler(
    args: CreateOrUpdateBotFrameworkBotArgs,
    context: DriverContext
  ): Promise<{
    output: Map<string, string>;
    summaries: string[];
  }> {
    const progressHandler = context.ui?.createProgressBar(
      getLocalizedString("driver.botFramework.progressBar.title"),
      1
    );
    try {
      await progressHandler?.start();

      this.validateArgs(args);

      await progressHandler?.next(
        getLocalizedString("driver.botFramework.progressBar.createOrUpdateBot")
      );

      let callingEndpoint: string | undefined = undefined;
      let configuredChannels: BotChannelType[] | undefined = undefined;
      if (args.channels) {
        configuredChannels = [];
        for (const channel of args.channels) {
          if (channel.name === BotChannelType.MicrosoftTeams) {
            callingEndpoint = (channel as MicrosoftTeamsChannelSettings).callingWebhook;
            configuredChannels.push(BotChannelType.MicrosoftTeams);
          } else if (channel.name === BotChannelType.M365Extensions) {
            configuredChannels.push(BotChannelType.M365Extensions);
          }
        }
      }
      const botRegistrationData: IBotRegistration = {
        botId: args.botId,
        name: args.name,
        description: args.description ?? "",
        iconUrl: args.iconUrl ?? "",
        messagingEndpoint: args.messagingEndpoint,
        callingEndpoint: callingEndpoint ?? "",
        configuredChannels,
      };

      const botRegistration: BotRegistration = new LocalBotRegistration();
      const result = await botRegistration.createOrUpdateBotRegistration(
        context.m365TokenProvider,
        botRegistrationData
      );

      if (result.isErr()) {
        throw result.error;
      }

      await progressHandler?.end(true);

      return {
        output: new Map<string, string>(),
        summaries: [
          result.value
            ? getLocalizedString("driver.botFramework.summary.update", `${botUrl}${args.botId}`)
            : getLocalizedString("driver.botFramework.summary.create", `${botUrl}${args.botId}`),
        ],
      };
    } catch (error) {
      await progressHandler?.end(false);

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

  private validateArgs(args: CreateOrUpdateBotFrameworkBotArgs): void {
    const invalidParameters: string[] = [];

    if (!args.botId || typeof args.botId !== "string") {
      invalidParameters.push("botId");
    }

    if (!args.name || typeof args.name !== "string") {
      invalidParameters.push("name");
    }

    if (!args.messagingEndpoint || typeof args.messagingEndpoint !== "string") {
      invalidParameters.push("messagingEndpoint");
    }

    if (args.description && typeof args.description !== "string") {
      invalidParameters.push("description");
    }

    if (args.iconUrl && typeof args.iconUrl !== "string") {
      invalidParameters.push("iconUrl");
    }

    if (args.channels) {
      if (!Array.isArray(args.channels)) {
        invalidParameters.push("channels");
      } else {
        for (const channel of args.channels) {
          if (
            !channel.name ||
            typeof channel.name !== "string" ||
            (channel.name !== BotChannelType.MicrosoftTeams &&
              channel.name !== BotChannelType.M365Extensions)
          ) {
            invalidParameters.push("channels");
            break;
          }
          if (channel.name === BotChannelType.MicrosoftTeams) {
            const callingWebhook = (channel as MicrosoftTeamsChannelSettings).callingWebhook;
            if (callingWebhook && typeof callingWebhook !== "string") {
              invalidParameters.push("channels");
              break;
            }
          }
        }
      }
    }

    if (invalidParameters.length > 0) {
      throw new InvalidActionInputError(actionName, invalidParameters, helpLink);
    }
  }
}
