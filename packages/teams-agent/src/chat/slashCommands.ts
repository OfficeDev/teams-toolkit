/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from "vscode";
import { type AgentRequest, type IAgentRequestHandler } from "./agent";
import { detectIntent } from "./intentDetection";

/**
 * A camel cased string that names the slash command. Will be used as the string that the user types to invoke the command.
 */
export type SlashCommandName = string;

interface ITeamsChatAgentResult extends vscode.ChatAgentResult2 {
  slashCommand: string;
  sampleIds?: string[];
}

/**
 * The result of a slash command handler.
 */
export type SlashCommandHandlerResult = {
  /**
   * The VsCode chat agent result.
   */
  chatAgentResult: ITeamsChatAgentResult,
  /**
   * Any follow-up messages to be given for this result.
   */
  followUp?: vscode.ChatAgentFollowup[],
  /**
   * The chain of slash command handlers that were invoked to produce this result.
   */
  handlerChain?: string[]
} | undefined;

/**
 * A handler for a slash command.
 */
export type SlashCommandHandler = (request: AgentRequest) => Promise<SlashCommandHandlerResult>;

/**
 * The configuration for a slash command.
 */
export type SlashCommandConfig = {
  /**
   * A short sentence description of the slash command. Should give the user a good idea of what the command does.
   */
  shortDescription: string,
  /**
   * A longer sentence description of the slash command. Should make clear to the user when the command is appropriate to use.
   */
  longDescription: string,
  /**
   * A sentence description that helps copilot understand when the command should be used.
   */
  intentDescription?: string,
  handler: SlashCommandHandler
};

export type SlashCommand = [SlashCommandName, SlashCommandConfig];

export type SlashCommands = Map<string, SlashCommandConfig>;

export type FallbackSlashCommandHandlers = {
  /**
   * The slash command to use when the user doesn't provide any input. If a string, then
   * it is the name of the slash command to use. If a function, then it is the handler to use.
   */
  noInput?: SlashCommandHandler | string;

  /**
   * The slash command to use when the user provides input without a slash command specified and
   * intent detection cannot find a slash command to use. If a string, then it is the name of the
   * slash command to use. If a function, then it is the handler to use.
   */
  default?: SlashCommandHandler | string;
};

export type SlashCommmandOwnerOptions = {
  /**
   * If true, then intent detection will not be used to find a slash command to use in the case that
   * the user provides input without a slash command specified.
   */
  disableIntentDetection?: boolean;
};

export class SlashCommandsOwner implements IAgentRequestHandler {
  private _invokeableSlashCommands: SlashCommands;
  private _fallbackSlashCommands: FallbackSlashCommandHandlers;
  private _disableIntentDetection: boolean;

  private _previousSlashCommandHandlerResult: SlashCommandHandlerResult;

  constructor(fallbackSlashCommands: FallbackSlashCommandHandlers, options?: SlashCommmandOwnerOptions) {
    this._invokeableSlashCommands = new Map();
    this._fallbackSlashCommands = fallbackSlashCommands;
    this._disableIntentDetection = options?.disableIntentDetection || false;
  }

  public addInvokeableSlashCommands(slashCommands: SlashCommands): void {
    for (const slashCommand of slashCommands.entries()) {
      this._invokeableSlashCommands.set(slashCommand[0], slashCommand[1]);
    }
  }

  public async handleRequestOrPrompt(request: AgentRequest): Promise<SlashCommandHandlerResult> {
    const getHandlerResult = await this._getSlashCommandHandlerForRequest(request);
    if (getHandlerResult.handler !== undefined) {
      const handler = getHandlerResult.handler;
      const refinedRequest = getHandlerResult.refinedRequest;

      const result = await handler(refinedRequest);
      this._previousSlashCommandHandlerResult = result;
      if (result !== undefined) {
        if (!result?.handlerChain) {
          result.handlerChain = [refinedRequest.slashCommand || "unknown"];
        } else {
          result.handlerChain.unshift(refinedRequest.slashCommand || "unknown");
        }
      }
      return result;
    } else {
      return undefined;
    }
  }

  public getFollowUpForLastHandledSlashCommand(result: vscode.ChatAgentResult2, _token: vscode.CancellationToken): vscode.ChatAgentFollowup[] | undefined {
    if (result === this._previousSlashCommandHandlerResult?.chatAgentResult) {
      const followUpForLastHandledSlashCommand = this._previousSlashCommandHandlerResult?.followUp;
      this._previousSlashCommandHandlerResult = undefined;
      return followUpForLastHandledSlashCommand;
    } else {
      return undefined;
    }
  }

  public getSlashCommands(): ([string, SlashCommandConfig])[] {
    return Array.from(this._invokeableSlashCommands.entries());
  }

  private async _getSlashCommandHandlerForRequest(request: AgentRequest): Promise<{ refinedRequest: AgentRequest, handler: SlashCommandHandler | undefined }> {
    const { prompt: prompt, command: parsedCommand } = this._preProcessPrompt(request.userPrompt);

    // trust VS Code to parse the command out for us, but also look for a parsed command for any "hidden" commands that VS Code doesn't know to parse out.
    const command = request.slashCommand || parsedCommand;

    let result: { refinedRequest: AgentRequest, handler: SlashCommandHandler | undefined } | undefined;

    if (!result && prompt === "" && !command) {
      result = {
        refinedRequest: { ...request, slashCommand: "noInput", userPrompt: prompt, },
        handler: typeof this._fallbackSlashCommands.noInput === "string" ?
          this._invokeableSlashCommands.get(this._fallbackSlashCommands.noInput)?.handler :
          this._fallbackSlashCommands.noInput
      };
    }

    if (!result && !!command) {
      const slashCommand = this._invokeableSlashCommands.get(command);
      if (slashCommand !== undefined) {
        result = {
          refinedRequest: { ...request, slashCommand: command, userPrompt: prompt, },
          handler: slashCommand.handler
        };
      }
    }

    if (!result && this._disableIntentDetection !== true) {
      const intentDetectionTargets = Array.from(this._invokeableSlashCommands.entries())
        .map(([name, config]) => ({ name: name, intentDetectionDescription: config.intentDescription || config.shortDescription }));
      const detectedTarget = await detectIntent(intentDetectionTargets, request);
      if (detectedTarget !== undefined) {
        const command = detectedTarget.name;
        const slashCommand = this._invokeableSlashCommands.get(command);
        if (slashCommand !== undefined) {
          result = {
            refinedRequest: { ...request, slashCommand: command, userPrompt: prompt, },
            handler: slashCommand.handler
          };
        }
      }
    }

    if (!result) {
      result = {
        refinedRequest: { ...request, slashCommand: "default", userPrompt: prompt, },
        handler: typeof this._fallbackSlashCommands.default === "string" ?
          this._invokeableSlashCommands.get(this._fallbackSlashCommands.default)?.handler :
          this._fallbackSlashCommands.default
      };
    }

    return result;
  }

  /**
   * Takes `prompt` and:
   * 1. Trims it
   * 2. If it starts with a `/<command>`, then it returns the command and the prompt without the command
   * 3. Otherwise, it returns the prompt as is
   */
  private _preProcessPrompt(prompt: string): { command?: string, prompt: string } {
    const trimmedPrompt = prompt.trim();
    const commandMatch = trimmedPrompt.match(/^\/(\w+)\s*(.*)$/);
    if (commandMatch) {
      return { command: commandMatch[1], prompt: commandMatch[2] };
    } else {
      return { prompt: trimmedPrompt };
    }
  }
}
