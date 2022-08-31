// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, ActivityTypes, Middleware, TurnContext } from "botbuilder";
import { CommandMessage, TeamsFxBotCommandHandler, TriggerPatterns } from "../interface";

/**
 * @internal
 */
export class CommandResponseMiddleware implements Middleware {
  public readonly commandHandlers: TeamsFxBotCommandHandler[] = [];

  constructor(handlers?: TeamsFxBotCommandHandler[]) {
    if (handlers && handlers.length > 0) {
      this.commandHandlers.push(...handlers);
    }
  }

  public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    if (context.activity.type === ActivityTypes.Message) {
      // Invoke corresponding command handler for the command response
      const commandText = this.getActivityText(context.activity);

      const message: CommandMessage = {
        text: commandText,
      };

      for (const handler of this.commandHandlers) {
        const matchResult = this.shouldTrigger(handler.triggerPatterns, commandText);

        // It is important to note that the command bot will stop processing handlers
        // when the first command handler is matched.
        if (!!matchResult) {
          message.matches = Array.isArray(matchResult) ? matchResult : void 0;
          const response = await handler.handleCommandReceived(context, message);

          if (typeof response === "string") {
            await context.sendActivity(response);
          } else {
            const replyActivity = response as Partial<Activity>;
            if (replyActivity) {
              await context.sendActivity(replyActivity);
            }
          }

          break;
        }
      }
    }

    await next();
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
}
