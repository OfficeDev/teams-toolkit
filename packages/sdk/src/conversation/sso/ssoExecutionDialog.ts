// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ComponentDialog,
  WaterfallDialog,
  Dialog,
  DialogSet,
  DialogTurnStatus,
} from "botbuilder-dialogs";
import {
  Activity,
  ActivityTypes,
  StatePropertyAccessor,
  Storage,
  tokenExchangeOperationName,
  TurnContext,
} from "botbuilder";
import { CommandMessage, TeamsFxBotSsoCommandHandler, TriggerPatterns } from "../interface";
import { TeamsBotSsoPrompt } from "../../bot/teamsBotSsoPrompt";
import { TeamsBotSsoPromptTokenResponse } from "../../bot/teamsBotSsoPromptTokenResponse";
import { TeamsFx } from "../../core/teamsfx";
import "isomorphic-fetch";
import { v4 as uuidv4 } from "uuid";

const DIALOG_NAME = "SsoExecutionDialog";
const TEAMS_SSO_PROMPT_ID = "TeamsFxSsoPrompt";
const COMMAND_ROUTE_DIALOG = "CommandRouteDialog";
/**
 * Sso execution dialog, use to handle sso command
 */
export class SsoExecutionDialog extends ComponentDialog {
  private requiredScopes: string[];
  private dedupStorage: Storage;
  private dedupStorageKeys: string[] = [];
  private commandMapping: Map<string, string | RegExp | (string | RegExp)[]> = new Map<
    string,
    string | RegExp | (string | RegExp)[]
  >();

  /**
   * Creates a new instance of the SsoExecutionDialog.
   * @param dedupStorage Helper storage to remove duplicated messages
   * @param requiredScopes The list of scopes for which the token will have access
   * @param teamsfx {@link TeamsFx} instance for authentication
   */
  constructor(dedupStorage: Storage, requiredScopes: string[], teamsfx: TeamsFx) {
    super(DIALOG_NAME);

    this.initialDialogId = COMMAND_ROUTE_DIALOG;

    this.dedupStorage = dedupStorage;
    this.dedupStorageKeys = [];
    this.requiredScopes = requiredScopes;

    const ssoDialog = new TeamsBotSsoPrompt(teamsfx, TEAMS_SSO_PROMPT_ID, {
      scopes: this.requiredScopes,
      endOnInvalidMessage: true,
    });
    this.addDialog(ssoDialog);

    const commandRouteDialog = new WaterfallDialog(COMMAND_ROUTE_DIALOG, [
      this.commandRouteStep.bind(this),
    ]);
    this.addDialog(commandRouteDialog);
  }

  /**
   * Add TeamsFxBotSsoCommandHandler instance
   * @param handler TeamsFxBotSsoCommandHandler instance
   */
  public addCommand(handler: TeamsFxBotSsoCommandHandler): void {
    if (!handler.commandId) {
      handler.commandId = uuidv4();
    }
    const dialog = new WaterfallDialog(handler.commandId, [
      this.ssoStep.bind(this),
      this.dedupStep.bind(this),
      async (stepContext: any) => {
        const tokenResponse: TeamsBotSsoPromptTokenResponse = stepContext.result.tokenResponse;
        const context: TurnContext = stepContext.context;
        try {
          if (tokenResponse) {
            const message: CommandMessage = stepContext.result.message;
            const matchResult = this.shouldTrigger(handler.triggerPatterns, message.text);
            message.matches = Array.isArray(matchResult) ? matchResult : void 0;
            const response = await handler.handleCommandReceived(
              context,
              message,
              tokenResponse.ssoToken
            );

            if (typeof response === "string") {
              await context.sendActivity(response);
            } else {
              const replyActivity = response as Partial<Activity>;
              if (replyActivity) {
                await context.sendActivity(replyActivity);
              }
            }
          } else {
            await context.sendActivity("Failed to retrieve user token from conversation context.");
          }
          return await stepContext.endDialog();
        } catch (error: unknown) {
          await context.sendActivity("Failed to retrieve user token from conversation context.");
          await context.sendActivity((error as Error).message as string);
          return await stepContext.endDialog();
        }
      },
    ]);

    if (this.commandMapping.has(handler.commandId)) {
      throw new Error(
        `Cannot add command. There is already a command with same id ${handler.commandId}`
      );
    }
    this.commandMapping.set(handler.commandId, handler.triggerPatterns);
    this.addDialog(dialog);
  }

  /**
   * The run method handles the incoming activity (in the form of a DialogContext) and passes it through the dialog system.
   *
   * @param context The context object for the current turn.
   * @param accessor The instance of StatePropertyAccessor for dialog system.
   */
  public async run(context: TurnContext, accessor: StatePropertyAccessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    const results = await dialogContext.continueDialog();
    if (results && results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  private getActivityText(activity: Activity): string {
    let text = activity.text;
    const removedMentionText = TurnContext.removeRecipientMention(activity);
    if (removedMentionText) {
      text = removedMentionText
        .toLowerCase()
        .replace(/\n|\r\n/g, "")
        .trim();
    }

    return text;
  }

  private async commandRouteStep(stepContext: any) {
    const turnContext = stepContext.context as TurnContext;

    const text = this.getActivityText(turnContext.activity);

    const commandId = this.matchCommands(text);
    if (commandId) {
      return await stepContext.beginDialog(commandId);
    }
    await stepContext.context.sendActivity(`Cannot find command: ${text}`);
    return await stepContext.endDialog();
  }

  private async ssoStep(stepContext: any) {
    try {
      const turnContext = stepContext.context as TurnContext;

      const text = this.getActivityText(turnContext.activity);
      const message: CommandMessage = {
        text,
      };

      stepContext.options.commandMessage = message;

      return await stepContext.beginDialog(TEAMS_SSO_PROMPT_ID);
    } catch (error: unknown) {
      const context = stepContext.context;
      await context.sendActivity("Failed to run SSO step");
      await context.sendActivity((error as Error).message);
      return await stepContext.endDialog();
    }
  }

  private async dedupStep(stepContext: any) {
    try {
      const tokenResponse = stepContext.result;
      // Only dedup after ssoStep to make sure that all Teams client would receive the login request
      if (tokenResponse && (await this.shouldDedup(stepContext.context))) {
        return Dialog.EndOfTurn;
      }
      return await stepContext.next({
        tokenResponse,
        message: stepContext.options.commandMessage,
      });
    } catch (error: unknown) {
      const context = stepContext.context;
      await context.sendActivity("Failed to run dedup step");
      await context.sendActivity((error as Error).message);
      return await stepContext.endDialog();
    }
  }

  /**
   * Called when the component is ending.
   *
   * @param context Context for the current turn of conversation.
   */
  protected async onEndDialog(context: TurnContext) {
    const conversationId = context.activity.conversation.id;
    const currentDedupKeys = this.dedupStorageKeys.filter((key) => key.indexOf(conversationId) > 0);
    await this.dedupStorage.delete(currentDedupKeys);
    this.dedupStorageKeys = this.dedupStorageKeys.filter((key) => key.indexOf(conversationId) < 0);
  }

  /**
   * If a user is signed into multiple Teams clients, the Bot might receive a "signin/tokenExchange" from each client.
   * Each token exchange request for a specific user login will have an identical activity.value.Id.
   * Only one of these token exchange requests should be processed by the bot. For a distributed bot in production,
   * this requires a distributed storage to ensure only one token exchange is processed.
   * @param context Context for the current turn of conversation.
   * @returns boolean value indicate whether the message should be removed
   */
  private async shouldDedup(context: TurnContext): Promise<boolean> {
    const storeItem = {
      eTag: context.activity.value.id,
    };

    const key = this.getStorageKey(context);
    const storeItems = { [key]: storeItem };

    try {
      await this.dedupStorage.write(storeItems);
      this.dedupStorageKeys.push(key);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.indexOf("eTag conflict")) {
        return true;
      }
      throw err;
    }
    return false;
  }

  private getStorageKey(context: TurnContext): string {
    if (!context || !context.activity || !context.activity.conversation) {
      throw new Error("Invalid context, can not get storage key!");
    }
    const activity = context.activity;
    const channelId = activity.channelId;
    const conversationId = activity.conversation.id;
    if (activity.type !== ActivityTypes.Invoke || activity.name !== tokenExchangeOperationName) {
      throw new Error("TokenExchangeState can only be used with Invokes of signin/tokenExchange.");
    }
    const value = activity.value;
    if (!value || !value.id) {
      throw new Error("Invalid signin/tokenExchange. Missing activity.value.id.");
    }
    return `${channelId}/${conversationId}/${value.id}`;
  }

  private matchPattern(pattern: string | RegExp, text: string): boolean | RegExpMatchArray {
    if (text) {
      if (typeof pattern === "string") {
        const regExp = new RegExp(pattern as string, "i");
        return regExp.test(text);
      }

      if (pattern instanceof RegExp) {
        const matches = text.match(pattern as RegExp);
        return matches ?? false;
      }
    }

    return false;
  }

  private shouldTrigger(patterns: TriggerPatterns, text: string): RegExpMatchArray | boolean {
    const expressions = Array.isArray(patterns) ? patterns : [patterns];

    for (const ex of expressions) {
      const arg = this.matchPattern(ex, text);
      if (arg) return arg;
    }

    return false;
  }

  private matchCommands(text: string): string | undefined {
    for (const command of this.commandMapping) {
      const pattern: TriggerPatterns = command[1];

      if (this.shouldTrigger(pattern, text)) {
        return command[0];
      }
    }

    return undefined;
  }
}
