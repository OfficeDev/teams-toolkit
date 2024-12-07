/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.
 * -------------------------------------------------------------------------------------------
 */

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

export class CopilotLog {
  static get logMessageStart(): string {
    return "-----------------------------------------------------------------\n\n";
  }

  static get indentation(): string {
    return "                    ";
  }

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
    this.functionsSelectedForInvocation =
      message.functionsSelectedForInvocation;
    this.functionExecutions = message.functionExecutions;

    if (this.functionExecutions) {
      this.functionExecutions.forEach((functionExecution) => {
        try {
          if (functionExecution.requestUri) {
            new URL(functionExecution.requestUri);
          }
        } catch (error) {
          throw new Error(`Error creating URL object for requestUri: ${functionExecution.requestUri}`);
        }
      });
    }
  }

  format(): string {
    let formattedLog = "";
    formattedLog += this.formatEnabledPlugins();
    formattedLog += this.formatMatchedFunctionCandidates();
    formattedLog += this.formatFunctionsSelectedForInvocation();
    formattedLog += this.formatFunctionExecutions();

    return formattedLog;
  }

  formatEnabledPlugins(): string {
    let formattedLog = "";
    if (this.enabledPlugins && this.enabledPlugins.length > 0) {
      formattedLog += CopilotLog.logMessageStart;
      formattedLog += "#       Enabled Plugins\n\n";
      this.enabledPlugins.forEach((plugin, i) => {
        formattedLog += `## ${i + 1}    name:       ${plugin.name || ""}\n`;
        formattedLog += `        id:         ${plugin.id}\n`;
        if (plugin.version) {
          formattedLog += `        version:    ${plugin.version}\n`;
        }
        formattedLog += "\n";
      });
    }
    else {
      formattedLog += CopilotLog.logMessageStart;
      formattedLog += "#       Enabled Plugins\n\n";
      formattedLog += "##      message:    No plugins enabled.\n\n";
    }
    return formattedLog;
  }

  formatMatchedFunctionCandidates(): string {
    let formattedLog = "";
    if (this.matchedFunctionCandidates && this.matchedFunctionCandidates.length > 0) {
      formattedLog += CopilotLog.logMessageStart;
      formattedLog += "#       Matched Functions\n\n";
      this.matchedFunctionCandidates.forEach((matchedFunction, i) => {
        formattedLog += `## ${i + 1}    name:       ${
          matchedFunction.plugin.name
        }\n`;
        formattedLog += `        id:         ${matchedFunction.plugin.id}\n`;
        formattedLog += `        function:   ${matchedFunction.functionDisplayName}\n`;
        formattedLog += "\n";
      });
    }
    else {
      formattedLog += CopilotLog.logMessageStart;
      formattedLog += "#       Matched Functions\n\n";
      formattedLog += "##      message:    No matched functions.\n\n";
    }

    return formattedLog;
  }

  formatFunctionsSelectedForInvocation(): string {
    let formattedLog = "";
    if (this.functionsSelectedForInvocation) {
      formattedLog += CopilotLog.logMessageStart;
      formattedLog += "#       Selected Functions\n\n";
      this.functionsSelectedForInvocation.forEach((selectedFunction, i) => {
        formattedLog += `## ${i + 1}    name:       ${
          selectedFunction.plugin.name || ""
        }\n`;
        formattedLog += `        id:         ${selectedFunction.plugin.id}\n`;
        formattedLog += `        function:   ${selectedFunction.functionDisplayName}\n`;
        formattedLog += "\n";
      });
    }
    return formattedLog;
  }

  formatFunctionExecutions(): string {
    let formattedLog = "";
    if (this.functionExecutions) {
      formattedLog += CopilotLog.logMessageStart;
      formattedLog += "#       Function Execution Details\n\n";
      this.functionExecutions.forEach((functionExecution, i) => {
        formattedLog += `## ${i + 1}    name:       ${
          functionExecution.function.plugin.name || ""
        }\n`;
        formattedLog += `        id:         ${functionExecution.function.plugin.id}\n`;
        formattedLog += `        function:   ${functionExecution.function.functionDisplayName}\n`;
        formattedLog += functionExecution.parameters ? `        parameters: ${CopilotLog.getIndentedJson(functionExecution.parameters)}\n` : "";
        formattedLog += functionExecution.requestUri ? `        request:    ${functionExecution.requestMethod} ${functionExecution.requestUri}\n` : "";
        formattedLog += `        response:   Status: ${functionExecution.executionStatus.responseStatus}\n`;
        formattedLog += functionExecution.responseContentType ? `                    Content-Type: ${functionExecution.responseContentType}\n` : "";
        formattedLog += CopilotLog.getFormattedResponseContent(functionExecution.responseContentType, functionExecution.responseContent);
        formattedLog += functionExecution.errorMessage ? `        message:    ${functionExecution.errorMessage}\n` : "";
        formattedLog += "\n";
      });
    }
    return formattedLog;
  }

  static getFormattedResponseContent(responseContentType: string, responseContent: string): string {
    if (!responseContent) {
      return "";
    }

    if (CopilotLog.isJson(responseContentType, responseContent))
    {
      const responseContentObject: unknown = JSON.parse(responseContent);
      return this.indentation + CopilotLog.getIndentedJson(responseContentObject) + "\n";
    }

    return this.indentation + responseContent + "\n";
  }

  static isJson(responseContentType: string | undefined, responseContent: string): boolean {
    if (responseContentType) {
      return /(application|text)\/.*json/.test(responseContentType);
    }

    try {
      JSON.parse(responseContent);
      return true;
    } catch (error) {
      return false;
    }
  }

  static getIndentedJson(json: unknown): string {
    const jsonText = JSON.stringify(json, null, 2);
    return jsonText.replace(/\n/g, `\n${this.indentation}`);
  }
}
