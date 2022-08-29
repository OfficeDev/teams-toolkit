// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Activity, ActivityTypes, Middleware, TurnContext } from "botbuilder";
import {
  CommandMessage,
  SsoExecutionActivityHandler,
  TeamsFxBotCommandHandler,
  TeamsFxBotSsoCommandHandler,
  TriggerPatterns,
} from "../interface";

/**
 * @internal
 */
export class CommandResponseMiddleware implements Middleware {
  public readonly commandHandlers: (TeamsFxBotCommandHandler | TeamsFxBotSsoCommandHandler)[] = [];

  public activityHandler: SsoExecutionActivityHandler | undefined;

  constructor(
    handlers?: TeamsFxBotCommandHandler[],
    ssoHandlers?: TeamsFxBotSsoCommandHandler[],
    activityHandler?: SsoExecutionActivityHandler | undefined
  ) {
    handlers = handlers ?? [];
    ssoHandlers = ssoHandlers ?? [];
    if (handlers.length > 0 || ssoHandlers.length > 0) {
      this.commandHandlers.push(...handlers, ...ssoHandlers);

      this.activityHandler = activityHandler;

      for (const ssoHandler of ssoHandlers) {
        this.activityHandler?.addCommand(ssoHandler);
      }
    }
  }

  /**
   * Set sso execution activity handler
   * @param activityHandler SsoExecutionActivityHandler instance
   */
  public setActivityHandler(activityHandler: SsoExecutionActivityHandler) {
    this.activityHandler = activityHandler;
  }

  /**
   * Get sso execution activity handler
   * @returns SsoExecutionActivityHandler instance or undefined
   */
  public getActivityHandler(): SsoExecutionActivityHandler | undefined {
    return this.activityHandler;
  }

  public async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    if (context.activity.type === ActivityTypes.Message) {
      // Invoke corresponding command handler for the command response
      const commandText = this.getActivityText(context.activity);

      for (const handler of this.commandHandlers) {
        const matchResult = this.shouldTrigger(handler.triggerPatterns, commandText);

        // It is important to note that the command bot will stop processing handlers
        // when the first command handler is matched.
        if (!!matchResult) {
          if (this.isSsoExecutionHandler(handler)) {
            await this.activityHandler?.run(context);
          } else {
            const message: CommandMessage = {
              text: commandText,
            };
            message.matches = Array.isArray(matchResult) ? matchResult : void 0;
            const response = await (handler as TeamsFxBotCommandHandler).handleCommandReceived(
              context,
              message
            );
            if (typeof response === "string") {
              await context.sendActivity(response);
            } else {
              const replyActivity = response as Partial<Activity>;
              if (replyActivity) {
                await context.sendActivity(replyActivity);
              }
            }
          }
        }
      }
    } else {
      await this.activityHandler?.run(context);
    }
    await next();
  }

  private isSsoExecutionHandler(
    handler: TeamsFxBotCommandHandler | TeamsFxBotSsoCommandHandler
  ): boolean {
    return "commandId" in handler;
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
