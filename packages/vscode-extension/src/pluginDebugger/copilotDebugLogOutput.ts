// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import fs from "fs-extra";
import { LogLevel } from "@microsoft/teamsfx-api";
import { defaultExtensionLogPath } from "../globalVariables";

interface Plugin {
  name: string;
  id: string;
  version: string;
}

interface FunctionDescriptor {
  plugin: Plugin;
  functionDisplayName: string;
}

interface FunctionExecution {
  function: FunctionDescriptor;
  executionStatus: {
    requestStatus: number;
    responseStatus: number;
    responseType: number;
  };
  parameters: Record<string, string>;
  requestUri: string;
  requestMethod: string;
  responseContent: string;
  responseContentType: string;
  errorMessage: string;
}

export const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
const YELLOW = "\u001b[33m";
const BLUE = "\u001b[34m";
const MAGENTA = "\u001b[35m";
export const WHITE = "\u001b[37m";
const GRAY = "\u001b[38;5;244m";

/**
 * @Sample [2021-03-15T03:41:04.961Z] - 0 plugin enabled.
 */
export function logToDebugConsole(logLevel: LogLevel, message: string): void {
  try {
    const dateString = new Date().toJSON();
    const debugConsole = vscode.debug.activeDebugConsole;
    if (logLevel === LogLevel.Info) {
      debugConsole.appendLine(WHITE + `[${dateString}] - ` + BLUE + `${message}`);
    } else if (logLevel === LogLevel.Warning) {
      debugConsole.appendLine(WHITE + `[${dateString}] - ` + YELLOW + `${message}`);
    } else if (logLevel === LogLevel.Error) {
      debugConsole.appendLine(WHITE + `[${dateString}] - ` + RED + `${message}`);
    } else if (logLevel === LogLevel.Debug) {
      debugConsole.appendLine(WHITE + `[${dateString}] - ` + GREEN + `${message}`);
    } else {
      debugConsole.appendLine(WHITE + `[${dateString}] - ${message}`);
    }
  } catch (e) {}
}

export async function writeCopilotLogToFile(log: string, filePath: string): Promise<void> {
  const fs = require("fs");
  await fs.appendFile(filePath, log + "\n");
}

export class CopilotDebugLog {
  enabledPlugins?: Plugin[];
  matchedFunctionCandidates?: FunctionDescriptor[];
  functionsSelectedForInvocation?: FunctionDescriptor[];
  functionExecutions?: FunctionExecution[];

  constructor(logAsJson: string) {
    let message: this;
    try {
      message = JSON.parse(logAsJson) as this;
    } catch (error) {
      throw new Error(`Error parsing logAsJson: ${(error as Error).message}`);
    }
    this.enabledPlugins = message.enabledPlugins;
    this.matchedFunctionCandidates = message.matchedFunctionCandidates;
    this.functionsSelectedForInvocation = message.functionsSelectedForInvocation;
    this.functionExecutions = message.functionExecutions;

    if (this.functionExecutions) {
      this.functionExecutions.forEach((functionExecution) => {
        try {
          if (functionExecution.requestUri) {
            new URL(functionExecution.requestUri);
          }
        } catch (error) {
          throw new Error(
            `Error creating URL object for requestUri: ${functionExecution.requestUri}`
          );
        }
      });
    }
  }

  write(): void {
    const debugConsole = vscode.debug.activeDebugConsole;
    if (this.enabledPlugins && this.enabledPlugins.length > 0) {
      debugConsole.appendLine("");
      logToDebugConsole(LogLevel.Info, `${this.enabledPlugins.length} enabled plugin(s).`);
      debugConsole.appendLine(WHITE + "Copilot plugin developer info:");
      debugConsole.appendLine("");
      this.enabledPlugins.forEach((plugin) => {
        debugConsole.appendLine(
          `${GREEN}(√) ${WHITE}Enabled plugin: ${MAGENTA}${plugin.name} ${GRAY}• version ${plugin.version} • ${plugin.id}`
        );

        if (!this.matchedFunctionCandidates || this.matchedFunctionCandidates.length === 0) {
          this.logNoMatchedFunctions(debugConsole);
        } else {
          this.matchedFunctionCandidates.forEach((matchedFunction) => {
            if (matchedFunction.plugin.id === plugin.id) {
              debugConsole.appendLine(
                `${GREEN}   (√) ${WHITE}Matched functions: ${MAGENTA}${matchedFunction.functionDisplayName}`
              );
              this.logFunctionExecutions(debugConsole, matchedFunction);
            } else {
              this.logNoMatchedFunctions(debugConsole);
            }
          });
        }
      });
    } else {
      debugConsole.appendLine("");
      logToDebugConsole(LogLevel.Info, `0 enabled plugin(s).`);
      debugConsole.appendLine(WHITE + "Copilot plugin developer info:");
      debugConsole.appendLine("");
      this.logNoPlugins(debugConsole);
    }
  }

  private logNoMatchedFunctions(debugConsole: vscode.DebugConsole): void {
    debugConsole.appendLine(`${RED}   (×) Error: ${WHITE}Matched functions: None`);
    debugConsole.appendLine(
      `${RED}      (×) Error: ${WHITE}Selected functions for execution: None`
    );
    debugConsole.appendLine(`${RED}         (×) Error: ${WHITE}Function execution details: None`);
  }

  private logNoPlugins(debugConsole: vscode.DebugConsole): void {
    debugConsole.appendLine(`${RED}(×) Error: ${WHITE}Enabled plugin: None`);
    debugConsole.appendLine(`${RED}   (×) Error: ${WHITE}Matched functions: None`);
    debugConsole.appendLine(
      `${RED}      (×) Error: ${WHITE}Selected functions for execution: None`
    );
    debugConsole.appendLine(`${RED}         (×) Error: ${WHITE}Function execution details: None`);
  }

  private logFunctionExecutions(
    debugConsole: vscode.DebugConsole,
    matchedFunction: FunctionDescriptor
  ): void {
    if (!this.functionsSelectedForInvocation || this.functionsSelectedForInvocation.length === 0) {
      this.logNoSelectedFunctions(debugConsole);
    } else {
      this.functionsSelectedForInvocation.forEach((selectedFunction) => {
        if (selectedFunction.functionDisplayName === matchedFunction.functionDisplayName) {
          debugConsole.appendLine(
            `${GREEN}      (√) ${WHITE}Selected functions for execution: ${MAGENTA}${selectedFunction.functionDisplayName}`
          );
          this.logExecutionDetails(debugConsole, matchedFunction);
        } else {
          this.logNoSelectedFunctions(debugConsole);
        }
      });
    }
  }

  private logNoSelectedFunctions(debugConsole: vscode.DebugConsole): void {
    debugConsole.appendLine(
      `${RED}      (×) Error: ${WHITE}Selected functions for execution: None`
    );
    debugConsole.appendLine(`${RED}         (×) Error: ${WHITE}Function execution details: None`);
  }

  private logExecutionDetails(
    debugConsole: vscode.DebugConsole,
    matchedFunction: FunctionDescriptor
  ): void {
    const logFileName = `Copilot log ${new Date().toISOString().replace(/-|:|\.\d+Z$/g, "")}.txt`;
    const logFilePath = `${defaultExtensionLogPath}/${logFileName}`;
    if (!this.functionExecutions || this.functionExecutions.length === 0) {
      debugConsole.appendLine(`${RED}      (×) Error: ${WHITE}Function execution details: None`);
    } else {
      this.functionExecutions.forEach((functionExecution) => {
        if (
          functionExecution.function.functionDisplayName === matchedFunction.functionDisplayName
        ) {
          debugConsole.appendLine(
            `${GREEN}         (√) ${WHITE}Function execution details: ${GREEN}Status ${functionExecution.executionStatus.responseStatus}, ${WHITE}refer to ${BLUE}${logFilePath}${WHITE} for all details.`
          );
          if (functionExecution.errorMessage) {
            debugConsole.appendLine(
              `${RED}            (×) Error: ${WHITE}${functionExecution.errorMessage}`
            );
          }
        } else {
          debugConsole.appendLine(
            `${RED}         (×) Error: ${WHITE}Function execution details: None`
          );
        }
      });
    }
  }

  static prettyPrintJson(jsonText: string): string {
    return JSON.stringify(JSON.parse(jsonText), null, 2);
  }
}
