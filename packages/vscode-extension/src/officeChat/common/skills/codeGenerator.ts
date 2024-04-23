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
  getUserInputBreakdownTaskSystemPrompt,
  getGenerateCodeUserPrompt,
  getGenerateCodeSamplePrompt,
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
    const breakdownResult = await this.userInputBreakdownTaskAsync(spec, token);

    console.debug(breakdownResult?.data.map((task) => `- ${task}`).join("\n"));
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
    if (!breakdownResult.shouldContinue) {
      // Reject will make the whole request rejected
      spec.sections = breakdownResult.data;
      return { result: ExecutionResultEnum.Rejected, spec: spec };
    }
    spec.appendix.host = breakdownResult.host;
    spec.appendix.codeTaskBreakdown = breakdownResult.data;
    spec.appendix.isCustomFunction = breakdownResult.customFunctions;
    spec.appendix.complexity = breakdownResult.complexity;

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
      spec.appendix.isCustomFunction,
      spec.appendix.codeTaskBreakdown,
      spec
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

  async userInputBreakdownTaskAsync(
    spec: Spec,
    token: CancellationToken
  ): Promise<null | {
    host: string;
    shouldContinue: boolean;
    customFunctions: boolean;
    data: string[];
    complexity: number;
  }> {
    const userPrompt = getUserInputBreakdownTaskUserPrompt(spec.userInput);
    const defaultSystemPrompt = getUserInputBreakdownTaskSystemPrompt();

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(userPrompt),
    ];
    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-4", // "copilot-gpt-3.5-turbo",
      messages,
      token
    );
    let copilotRet: {
      host: string;
      shouldContinue: boolean;
      customFunctions: boolean;
      complexity: number;
      data: string[];
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
      console.error("[User task breakdown] Failed to parse the response from Copilot:", error);
      return null;
    }

    if (!copilotRet.shouldContinue) {
      // The user ask is rejected
      return copilotRet;
    }
    // We're not able to control the LLM output very precisely, so we need to do some post-processing here
    // For non-custom functions, we need to make sure the entry function 'main' is included in the task breakdown
    // For custom functions, we need to make sure the entry function 'main' is not included in the task breakdown
    if (
      !copilotRet.customFunctions &&
      !copilotRet.data.find((task: string) => {
        return task.includes("function named 'main'");
      })
    ) {
      console.debug(
        `[User task breakdown] The entry function 'main' is missing from task breakdown.`
      );
      copilotRet.data.push(
        "Create an entry function named 'main'. This function doesn't take any parameters and will call other functions in the list in right order. The function should be declared as 'async function'."
      );
    }

    if (
      copilotRet.customFunctions &&
      copilotRet.data.find((task: string) => {
        return task.includes("entry function named 'main'");
      })
    ) {
      copilotRet.data = copilotRet.data.filter((task: string) => {
        return !task.includes("entry function named 'main'");
      });
    }

    return copilotRet;
  }

  async generateCode(
    token: CancellationToken,
    host: string,
    isCustomFunctions: boolean,
    suggestedFunction: string[],
    spec: Spec
  ) {
    const userPrompt = getGenerateCodeUserPrompt(spec.userInput, host, suggestedFunction);
    spec.appendix.telemetryData.properties[PropertySystemCodeGenTargetedOfficeHostApplication] =
      host;
    spec.appendix.telemetryData.properties[PropertySystemCodeGenIsCustomFunction] =
      isCustomFunctions.toString();
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

    let samplesPrompt = getGenerateCodeSamplePrompt();
    const scenarioSamples = new Map<string, SampleData>();
    // Then let's query if any code examples relevant to the user's ask that we can put as examples
    for (const task of suggestedFunction) {
      if (task.includes("function named 'main'")) {
        continue;
      }

      const samples = await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodesLLM(
        token,
        host,
        task,
        2 // Get top 2 most relevant samples for now
      );

      for (const [key, value] of samples) {
        if (!scenarioSamples.has(key)) {
          scenarioSamples.set(key, value);
        }
      }
    }

    if (scenarioSamples.size > 0) {
      const codeSnippets: string[] = [];
      scenarioSamples.forEach((sample, api) => {
        console.debug(`[Code generation] Sample matched: ${sample.description}`);
        codeSnippets.push(`
- ${sample.description}:
\`\`\`typescript
${sample.codeSample}
\`\`\`\n
`);
      });

      if (codeSnippets.length > 0) {
        samplesPrompt = samplesPrompt.concat(`\n${codeSnippets.join("\n")}\n\n`);
      }
    }

    if (!spec.appendix.telemetryData.measurements[MeasurementScenarioBasedSampleMatchedCount]) {
      spec.appendix.telemetryData.measurements[MeasurementScenarioBasedSampleMatchedCount] = 0;
    }
    spec.appendix.telemetryData.measurements[MeasurementScenarioBasedSampleMatchedCount] +=
      scenarioSamples.size > 0 ? 1 : 0;

    // Perform the desired operation
    // The order in array is matter, don't change it unless you know what you are doing
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatUserMessage(userPrompt),
      new LanguageModelChatSystemMessage(samplesPrompt),
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
