// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatSystemMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { getCodeGenerateGuidance } from "./codeGuidance";
import { CodeIssueDetector, DetectionResult } from "./codeIssueDetector";
import { ISkill } from "./iSkill"; // Add the missing import statement
import { Spec } from "./spec"; // Add the missing import statement
import {
  countMessageTokens,
  countMessagesTokens,
  getCopilotResponseAsString,
} from "../../../chat/utils";
import { ExecutionResultEnum } from "./executionResultEnum";
import {
  MeasurementSystemSelfReflectionAttemptCount,
  MeasurementSystemSelfReflectionAttemptSucceeded,
  MeasurementSelfReflectionExecutionTimeInTotalSec,
} from "../telemetryConsts";
import { customFunctionSystemPrompt, excelSystemPrompt } from "../../officePrompts";

export class CodeIssueCorrector implements ISkill {
  static MAX_TRY_COUNT = 10; // From the observation from a small set of test, fix over 2 rounds leads to worse result, set it to a smal number so we can fail fast
  name: string;
  capability: string;

  constructor() {
    this.name = "codeIssueCorrector";
    this.capability = "Fix code issues";
  }

  public canInvoke(spec: Spec): boolean {
    return (
      !!spec.appendix.host &&
      !!spec.appendix.codeSnippet &&
      !!spec.appendix.codeTaskBreakdown &&
      spec.appendix.codeTaskBreakdown.length > 0
    );
  }

  public async invoke(
    languageModel: LanguageModelChatUserMessage,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<{ result: ExecutionResultEnum; spec: Spec }> {
    const host = spec.appendix.host;
    let codeSnippet = spec.appendix.codeSnippet;
    const codeTaskBreakdown = spec.appendix.codeTaskBreakdown;

    let baseLineResuult: DetectionResult = await CodeIssueDetector.getInstance().detectIssuesAsync(
      response,
      host,
      spec.appendix.isCustomFunction,
      codeSnippet,
      spec.appendix.telemetryData
    );
    console.debug(
      `Baseline: [C] ${baseLineResuult.compileErrors.length}, [R] ${baseLineResuult.runtimeErrors.length}.`
    );

    const model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4" = "copilot-gpt-3.5-turbo";
    let maxRetryCount = 1;
    let issueTolerance = 10;

    if (spec.appendix.complexity < 25) {
      maxRetryCount = 5;
      issueTolerance = 3;
    } else if (spec.appendix.complexity < 50) {
      maxRetryCount = 5;
      issueTolerance = 3;
    } else if (spec.appendix.complexity < 75) {
      maxRetryCount = 7;
      issueTolerance = 5;
    } else {
      maxRetryCount = 7;
      issueTolerance = 5;
    }

    if (baseLineResuult.compileErrors.length === 0 && baseLineResuult.runtimeErrors.length === 0) {
      console.debug("No issue found in baseline, skip the self reflection.");
      return { result: ExecutionResultEnum.Success, spec: spec };
    }
    if (baseLineResuult.compileErrors.length > issueTolerance) {
      // Don't waste time on low quality code, fail fast
      console.debug(
        `${baseLineResuult.compileErrors.length} compile errors in baseline code that beyond our tolerance ${issueTolerance}, skip the self reflection.`
      );
      return { result: ExecutionResultEnum.Failure, spec: spec };
    }

    let additionalInfo = "";
    for (let index = 0; index < maxRetryCount; index++) {
      const t0 = performance.now();
      if (baseLineResuult.compileErrors.length > maxRetryCount - index) {
        // Let's fail fast, as if the error is too many, it's hard to fix in a few rounds
        console.debug(
          `${baseLineResuult.compileErrors.length} compile errors need to fix in next ${
            maxRetryCount - index
          } rounds, fail fast.`
        );
        break;
      }
      console.debug(`Self reflection iteration ${index + 1}.`);
      let statusString;
      if (baseLineResuult.compileErrors.length <= 2) {
        statusString = "Almost there...";
      } else if (baseLineResuult.compileErrors.length <= 5) {
        statusString = "It may takes a little bit longer...";
      } else if (baseLineResuult.compileErrors.length <= 10) {
        statusString = "It will takes a while, you may want to grab a cup of coffee ;-)";
      } else {
        statusString = "It will takes a long time...";
      }
      statusString = "fixing code issues... " + statusString;
      response.progress(statusString);
      let fixedCode = await this.fixIssueAsync(
        token,
        host,
        spec.appendix.isCustomFunction,
        codeSnippet,
        codeTaskBreakdown,
        baseLineResuult.compileErrors,
        baseLineResuult.runtimeErrors,
        additionalInfo,
        model
      );
      if (!fixedCode) {
        // something wrong, just to the next round
        continue;
      }
      const issuesAfterFix: DetectionResult =
        await CodeIssueDetector.getInstance().detectIssuesAsync(
          response,
          host,
          spec.appendix.isCustomFunction,
          fixedCode,
          spec.appendix.telemetryData
        );
      const terminateResult = this.terminateFixIteration(
        spec.appendix.complexity,
        codeSnippet,
        baseLineResuult,
        fixedCode,
        issuesAfterFix
      );
      if (terminateResult.terminate) {
        additionalInfo = terminateResult.suggestion;
        continue;
      }
      console.debug(
        ` After fix: [C] ${issuesAfterFix.compileErrors.length}, [R] ${issuesAfterFix.runtimeErrors.length}.`
      );

      //#region telemetry
      const t1 = performance.now();
      const duration = (t1 - t0) / 1000;
      if (
        !spec.appendix.telemetryData.measurements[MeasurementSelfReflectionExecutionTimeInTotalSec]
      ) {
        spec.appendix.telemetryData.measurements[MeasurementSelfReflectionExecutionTimeInTotalSec] =
          duration;
      } else {
        spec.appendix.telemetryData.measurements[
          MeasurementSelfReflectionExecutionTimeInTotalSec
        ] += duration;
      }
      console.debug(`Self reflection completed within ${duration} seconds.`);

      if (!spec.appendix.telemetryData.measurements[MeasurementSystemSelfReflectionAttemptCount]) {
        spec.appendix.telemetryData.measurements[MeasurementSystemSelfReflectionAttemptCount] = 0;
      }
      spec.appendix.telemetryData.measurements[MeasurementSystemSelfReflectionAttemptCount] += 1;
      //#endregion
      // In ideal case, we expect the result match the base line, however, if that is the last round, we accept the result
      // perhaps without check the equivalence of the base line
      if (
        issuesAfterFix.compileErrors.length === 0 &&
        (index == maxRetryCount - 1 || issuesAfterFix.areSame(baseLineResuult))
      ) {
        // no more issue, return the fixed code
        // A dirty hacky to remove the invacation of main function if any because LLM may generate it and hard to remove it
        const regex = /(await\s)?main\(\)(\..+)?;/gm;
        const matches = fixedCode.match(regex);
        if (matches && matches.length > 0) {
          fixedCode = fixedCode.replace(matches[0], "");
        }
        spec.appendix.codeSnippet = fixedCode;
        spec.appendix.telemetryData.properties[MeasurementSystemSelfReflectionAttemptSucceeded] =
          "true";
        return { result: ExecutionResultEnum.Success, spec: spec };
      }

      // Prepare for next iteration
      codeSnippet = fixedCode;
      baseLineResuult = issuesAfterFix;
    }

    spec.appendix.telemetryData.properties[MeasurementSystemSelfReflectionAttemptSucceeded] =
      "false";
    return { result: ExecutionResultEnum.Failure, spec: spec };
  }

  async fixIssueAsync(
    token: CancellationToken,
    host: string,
    isCustomFunctions: boolean,
    codeSnippet: string,
    substeps: string[],
    errorMessages: string[],
    warningMessage: string[],
    additionalInfo: string,
    model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4"
  ) {
    if (errorMessages.length === 0) {
      return codeSnippet;
    }
    const tempUserInput = `
# Role:
You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on TypeScript, JavaScript, popular algorithm, Office Add-ins API, and deep understanding on the feature of Office applications (Word, Excel, PowerPoint). You need to offer the assistance to fix the code issue in the user given code snippet.

# Context:
Given a Office JavaScript add-in code snippet. It have some errors and warnings in the code snippet. You should make code changes on my given code snippet to fix those errors and warnings.
\`\`\`typescript
${codeSnippet};
\`\`\`
${
  !!additionalInfo
    ? "The prior fix is inapprioriate, some details as '" +
      additionalInfo +
      "', you should learn from your past errors and avoid same problem in this try."
    : ""
}

# Your tasks:
Fix all errors on the given code snippet then return the updated code snippet back. 

Let's think step by step.
    `;

    const defaultSystemPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

# Context:
The user given code snippet generated based on steps below, you should make some code changes on the code snippet, then return the code snippet with changes back.
- ${substeps.join("\n- ")}

# Your task:
1. Fix listed errors and warining below all together. Don't introduce new errors.
- ${errorMessages.join("\n- ")}
- ${warningMessage.join("\n- ")}
2. update the user given code snippet with prior fixes.
3. Return the updated user given code snippet.
**You must always strickly follow the coding rule, and format of output**.

${getCodeGenerateGuidance(host)}

Format of output:
- The output should only contains code snippet. Beyond that, nothing else should be included in the output. 
- The code output should be in one single markdown code block. 
- Don't explain the code changes, just return the fixed code snippet.

Example of output:
That code snippet should surrounded by a pair of triple backticks, and must follow with a string "typescript". For example:
\`\`\`typescript
// The code snippet
\`\`\`

Let's think step by step.
    `;

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

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(tempUserInput),
    ];
    const referenceMessage: LanguageModelChatSystemMessage = new LanguageModelChatSystemMessage(
      referenceUserPrompt
    );
    const referMsgCount = countMessageTokens(referenceMessage);
    const msgCount = countMessagesTokens(messages);
    console.log(`token count: ${msgCount + referMsgCount}`);
    if (msgCount + referMsgCount < 3500) {
      messages.unshift(referenceMessage);
    }
    const copilotResponse = await getCopilotResponseAsString(model, messages, token);

    // extract the code snippet
    const regex = /```[\s]*typescript([\s\S]*?)```/gm;
    const matches = regex.exec(copilotResponse);
    if (!matches) {
      // something wrong with the LLM output
      // TODO: Add handling for this case
      console.error(
        "[Code issue fix] Failed to extract the code snippet from the response:",
        copilotResponse
      );
      return null;
    }

    const newCodeStr = matches[matches.length - 1].trim();
    if (codeSnippet.length - newCodeStr.length > newCodeStr.length) {
      // The code length reduced too much
      console.debug("Code length reduced too much.");
      return null;
    }

    return newCodeStr;
  }

  private terminateFixIteration(
    complexityScore: number,
    baselineCodeStr: string,
    baselineResult: DetectionResult,
    currentCodeStr: string,
    currentResult: DetectionResult
  ): { terminate: boolean; suggestion: string } {
    const codeLengthDelta: number = currentCodeStr.length - baselineCodeStr.length;
    const runtimeErrorDelta: number =
      currentResult.runtimeErrors.length - baselineResult.runtimeErrors.length;
    const compileErrorDelta: number =
      currentResult.compileErrors.length - baselineResult.compileErrors.length;

    if (codeLengthDelta < 0) {
      // The code length reduced
      if (Math.abs(codeLengthDelta) >= currentCodeStr.length) {
        // The code length reduced too much
        console.debug("Terminate: code length reduced too much.");
        return {
          terminate: true,
          suggestion: "You should send back with the whole snippets without any explanasion.",
        };
      }
    }

    if (compileErrorDelta > 0) {
      // fix a ge jimo
      console.debug("Terminate: compile error increased.");
      return {
        terminate: true,
        suggestion: "The previous fix introduced more compile error.",
      };
    }

    return {
      terminate: false,
      suggestion: "",
    };
  }
}
