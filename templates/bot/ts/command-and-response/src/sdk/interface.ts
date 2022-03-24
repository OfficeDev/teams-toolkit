import { Activity, TurnContext } from "botbuilder";

export interface TeamsFxBotCommandHandler {
  /**
   * The command name or RegExp pattern that can trigger this handler.
   */
  commandNameOrPattern: string | RegExp;

  /**
   * Handles a bot command received.
   * @param context The bot context.
   * @param receivedText The command text the user types from Teams.
   * @returns The activity or text to send as the command response.
   */
  handleCommandReceived(
    context: TurnContext,
    receivedText: string
  ): Promise<string | Partial<Activity>>;
}

export type Json = Record<string, any>;
