// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatSystemMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { correctPropertyLoadSpelling } from "../utils";
import { SampleProvider } from "../samples/sampleProvider";
import { ISkill } from "./iSkill"; // Add the missing import statement
import { Spec } from "./spec";
import { countMessagesTokens, getCopilotResponseAsString } from "../../../chat/utils";
import { ExecutionResultEnum } from "./executionResultEnum";
import {
  MeasurementCodeGenAttemptCount,
  MeasurementCodeGenExecutionTimeInTotalSec,
  MeasurementScenarioBasedSampleMatchedCount,
  PropertySystemCodeGenIsCustomFunction,
  PropertySystemCodeGenResult,
  PropertySystemCodeGenTargetedOfficeHostApplication,
  MeasurementSystemCodegenTaskBreakdownAttemptFailedCount,
} from "../telemetryConsts";
import {
  excelSystemPrompt,
  customFunctionSystemPrompt,
  getUserInputBreakdownTaskUserPrompt,
  getUserAskPreScanningSystemPrompt,
  getUserComplexAskBreakdownTaskSystemPrompt,
  getUserSimpleAskBreakdownTaskSystemPrompt,
  getGenerateCodeUserPrompt,
  getGenerateCodeSamplePrompt,
  getCodeSamplePrompt,
  getGenerateCodeDeclarationPrompt,
} from "../../officePrompts";
import { localize } from "../../../utils/localizeUtils";
import { SampleData } from "../samples/sampleData";
import { getTokenLimitation } from "../../consts";

export class CodeGenerator implements ISkill {
  name: string;
  capability: string;

  constructor() {
    this.name = "Code Generator";
    this.capability = "Generate code";
  }

  public canInvoke(spec: Spec): boolean {
    return !!spec && !!spec.userInput && spec.userInput.trim().length > 0;
  }

  public async invoke(
    languageModel: LanguageModelChatUserMessage,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<{ result: ExecutionResultEnum; spec: Spec }> {
    const t0 = performance.now();

    response.progress("Identify code-generation scenarios...");
    if (
      (!spec.appendix.host || spec.appendix.host.length === 0) &&
      spec.appendix.complexity === 0
    ) {
      const scanResult = await this.userAskPreScanningAsync(spec, token);
      if (!scanResult) {
        return { result: ExecutionResultEnum.Failure, spec: spec };
      }
      spec.appendix.host = scanResult.host;
      spec.appendix.isCustomFunction = scanResult.customFunctions;
      spec.appendix.complexity = scanResult.complexity;
      spec.appendix.shouldContinue = scanResult.shouldContinue;
    }

    if (!spec.appendix.shouldContinue) {
      // Reject will make the whole request rejected
      return { result: ExecutionResultEnum.Rejected, spec: spec };
    }

    if (!spec.appendix.codeSample || spec.appendix.codeSample.length === 0) {
      const samples = await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodesBM25(
        token,
        spec.appendix.host,
        spec.userInput,
        1
      );
      if (samples.size > 0) {
        console.debug(`Sample code found: ${Array.from(samples.keys())[0]}`);
        spec.appendix.codeSample = Array.from(samples.values())[0].codeSample;
      }
    }

    if (
      spec.appendix.codeTaskBreakdown.length === 0 &&
      spec.appendix.codeExplanation.length === 0
    ) {
      const breakdownResult = await this.userAskBreakdownAsync(
        token,
        spec.appendix.complexity,
        spec.appendix.isCustomFunction,
        spec.appendix.host,
        spec.userInput,
        spec.appendix.codeSample
      );

      console.debug(breakdownResult?.funcs.map((task) => `- ${task}`).join("\n"));
      if (!breakdownResult) {
        if (
          !spec.appendix.telemetryData.measurements[
            MeasurementSystemCodegenTaskBreakdownAttemptFailedCount
          ]
        ) {
          spec.appendix.telemetryData.measurements[
            MeasurementSystemCodegenTaskBreakdownAttemptFailedCount
          ] = 0;
        }
        spec.appendix.telemetryData.measurements[
          MeasurementSystemCodegenTaskBreakdownAttemptFailedCount
        ] += 1;
        return { result: ExecutionResultEnum.Failure, spec: spec };
      }
      spec.appendix.codeTaskBreakdown = breakdownResult.funcs;
      spec.appendix.codeExplanation = breakdownResult.spec;
    }

    if (!spec.appendix.telemetryData.measurements[MeasurementCodeGenAttemptCount]) {
      spec.appendix.telemetryData.measurements[MeasurementCodeGenAttemptCount] = 0;
    }
    spec.appendix.telemetryData.measurements[MeasurementCodeGenAttemptCount] += 1;
    let progressMessageStr = localize(
      "teamstoolkit.chatParticipants.officeAddIn.generateCode.hint"
    );
    if (spec.appendix.complexity >= 50) {
      progressMessageStr += localize(
        "teamstoolkit.chatParticipants.officeAddIn.generateCode.complex"
      );
    } else {
      progressMessageStr += localize(
        "teamstoolkit.chatParticipants.officeAddIn.generateCode.simple"
      );
    }
    response.progress(progressMessageStr);
    let codeSnippet: string | null = "";
    codeSnippet = await this.generateCode(
      token,
      spec.appendix.host,
      spec,
      spec.appendix.codeExplanation,
      spec.appendix.isCustomFunction,
      spec.appendix.codeTaskBreakdown,
      spec.appendix.codeSample
    );
    const t1 = performance.now();
    const duration = (t1 - t0) / 1000;
    if (!spec.appendix.telemetryData.measurements[MeasurementCodeGenExecutionTimeInTotalSec]) {
      spec.appendix.telemetryData.measurements[MeasurementCodeGenExecutionTimeInTotalSec] =
        duration;
    } else {
      spec.appendix.telemetryData.measurements[MeasurementCodeGenExecutionTimeInTotalSec] +=
        duration;
    }
    console.log(`Code generation took ${duration} seconds.`);
    if (!codeSnippet) {
      spec.appendix.telemetryData.properties[PropertySystemCodeGenResult] = "false";
      return { result: ExecutionResultEnum.Failure, spec: spec };
    }

    spec.appendix.telemetryData.properties[PropertySystemCodeGenResult] = "true";
    spec.appendix.codeSnippet = codeSnippet;
    return { result: ExecutionResultEnum.Success, spec: spec };
  }

  async userAskPreScanningAsync(
    spec: Spec,
    token: CancellationToken
  ): Promise<null | {
    host: string;
    shouldContinue: boolean;
    customFunctions: boolean;
    complexity: number;
  }> {
    const userPrompt = getUserInputBreakdownTaskUserPrompt(spec.userInput);
    const defaultSystemPrompt = getUserAskPreScanningSystemPrompt();

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(userPrompt),
    ];
    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-3.5-turbo", // "copilot-gpt-4", // "copilot-gpt-3.5-turbo",
      messages,
      token
    );
    let copilotRet: {
      host: string;
      shouldContinue: boolean;
      customFunctions: boolean;
      complexity: number;
    };

    try {
      if (!copilotResponse) {
        return null; // The response is empty
      }
      const codeSnippetRet = copilotResponse.match(/```json([\s\S]*?)```/);
      if (!codeSnippetRet) {
        // try if the LLM already give a json object
        copilotRet = JSON.parse(copilotResponse.trim());
      } else {
        copilotRet = JSON.parse(codeSnippetRet[1].trim());
      }
      console.log(`The complexity score: ${copilotRet.complexity}`);
    } catch (error) {
      console.error("[User task scanning] Failed to parse the response from Copilot:", error);
      return null;
    }

    return copilotRet;
  }

  async userAskBreakdownAsync(
    token: CancellationToken,
    complexity: number,
    isCustomFunctions: boolean,
    host: string,
    userInput: string,
    sampleCode: string
  ): Promise<null | {
    spec: string;
    funcs: string[];
  }> {
    const userPrompt = getUserInputBreakdownTaskUserPrompt(userInput);
    const defaultSystemPrompt =
      complexity >= 50
        ? getUserComplexAskBreakdownTaskSystemPrompt(userInput)
        : getUserSimpleAskBreakdownTaskSystemPrompt(userInput);

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatUserMessage(userPrompt),
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
    ];

    if (sampleCode.length > 0) {
      messages.push(new LanguageModelChatSystemMessage(getCodeSamplePrompt(sampleCode)));
    }

    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-4", //"copilot-gpt-4", // "copilot-gpt-3.5-turbo",
      messages,
      token
    );
    let copilotRet: {
      spec: string;
      funcs: string[];
    };

    try {
      if (!copilotResponse) {
        return null; // The response is empty
      }
      const codeSnippetRet = copilotResponse.match(/```json([\s\S]*?)```/);
      if (!codeSnippetRet) {
        // try if the LLM already give a json object
        copilotRet = JSON.parse(copilotResponse.trim());
      } else {
        copilotRet = JSON.parse(codeSnippetRet[1].trim());
      }
    } catch (error) {
      console.error("[User task breakdown] Failed to parse the response from Copilot:", error);
      return null;
    }
    // We're not able to control the LLM output very precisely, so we need to do some post-processing here
    // For non-custom functions, we need to make sure the entry function 'main' is included in the task breakdown
    // For custom functions, we need to make sure the entry function 'main' is not included in the task breakdown
    if (!isCustomFunctions) {
      copilotRet.funcs.push(
        "Create an entry function named 'main'. This function doesn't take any parameters and will call other functions in the list in right order. The function should be declared as 'async function'."
      );
    }

    return copilotRet;
  }

  async generateCode(
    token: CancellationToken,
    host: string,
    spec: Spec,
    codeSpec: string,
    isCustomFunctions: boolean,
    suggestedFunction: string[],
    sampleCode: string
  ) {
    const userPrompt = getGenerateCodeUserPrompt(codeSpec, host, suggestedFunction);
    let referenceUserPrompt = "";
    switch (host) {
      case "Excel":
        if (!isCustomFunctions) {
          referenceUserPrompt = excelSystemPrompt;
        } else {
          referenceUserPrompt = customFunctionSystemPrompt;
        }
        break;
      default:
        referenceUserPrompt = "";
        break;
    }

    const declarations = await SampleProvider.getInstance().getMostRelevantDeclarationsUsingLLM(
      token,
      host,
      codeSpec,
      sampleCode
    );

    spec.appendix.apiDeclarationsReference = declarations;

    let declarationPrompt = getGenerateCodeDeclarationPrompt();
    if (declarations.size > 0) {
      declarationPrompt += Array.from(declarations.values())
        .map((declaration) => `- ${declaration.definition}`)
        .join("\n");
    }

    let samplePrompt = getGenerateCodeSamplePrompt();
    if (sampleCode.length > 0) {
      samplePrompt += `
      \`\`\`typescript
      ${sampleCode}
      \`\`\`
      `;
    }
    // Perform the desired operation
    // The order in array is matter, don't change it unless you know what you are doing
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatUserMessage(userPrompt),
      new LanguageModelChatSystemMessage(declarationPrompt),
      new LanguageModelChatSystemMessage(samplePrompt),
      new LanguageModelChatSystemMessage(referenceUserPrompt),
    ];
    const model: "copilot-gpt-4" | "copilot-gpt-3.5-turbo" = "copilot-gpt-4";
    let msgCount = countMessagesTokens(messages);
    while (msgCount > getTokenLimitation(model)) {
      messages.pop();
      msgCount = countMessagesTokens(messages);
    }
    console.debug(`token count: ${msgCount}, number of messages remains: ${messages.length}.`);

    const copilotResponse = await getCopilotResponseAsString(model, messages, token);

    // extract the code snippet and the api list out
    const codeSnippetRet = copilotResponse.match(/```typescript([\s\S]*?)```/);
    if (!codeSnippetRet) {
      // something wrong with the LLM output
      // TODO: Add handling for this case
      console.error(
        "[Code generation] Failed to extract the code snippet from the response:",
        copilotResponse
      );
      return null;
    }

    return correctPropertyLoadSpelling(codeSnippetRet[1].trim());
  }
}
