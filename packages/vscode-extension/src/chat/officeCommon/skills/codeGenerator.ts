// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import ts = require("typescript");
import {
  CancellationToken,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { compressCode, writeLogToFile } from "../Utils";
import { SampleProvider } from "../samples/sampleProvider";
import { getCodeGenerateGuidance } from "./codeGuidance";
import { ISkill } from "./iSkill"; // Add the missing import statement
import { Spec } from "./spec";
import { getCopilotResponseAsString } from "../../utils";
import { ExecutionResultEnum } from "./executionResultEnum";

export class CodeGenerator implements ISkill {
  name: string;
  capability: string;

  constructor() {
    this.name = "Code Generator";
    this.capability = "Generate code";
  }

  public canInvoke(request: ChatRequest, spec: Spec): boolean {
    return !!request.prompt && request.prompt.length > 0 && !!spec;
  }

  public async invoke(
    languageModel: LanguageModelChatUserMessage,
    request: ChatRequest,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<ExecutionResultEnum> {
    if (
      !!spec.appendix.host ||
      !!spec.appendix.codeTaskBreakdown ||
      (spec.appendix.codeTaskBreakdown as string[]).length == 0
    ) {
      const breakdownResult = await this.userInputBreakdownTaskAsync(request, token);

      if (!breakdownResult) {
        return ExecutionResultEnum.Failure;
      }
      if (!breakdownResult.shouldContinue) {
        return ExecutionResultEnum.Rejected;
      }

      spec.appendix.host = breakdownResult.host;
      spec.appendix.codeTaskBreakdown = breakdownResult.data;
      spec.appendix.isCustomFunction = breakdownResult.customFunctions;
    }

    let codeSnippet: string | null = "";
    console.time("CodeGenerator.GenerateCode");
    codeSnippet = await this.generateCode(
      request,
      token,
      spec.appendix.host,
      spec.appendix.codeTaskBreakdown
    );
    console.timeEnd("CodeGenerator.GenerateCode");
    if (!codeSnippet) {
      return ExecutionResultEnum.Failure;
    }

    spec.appendix.codeSnippet = codeSnippet;
    await writeLogToFile(
      `The generated code snippet: \n\`\`\`typescript\n${codeSnippet}\`\`\`\n\n\n\n`
    );
    return ExecutionResultEnum.Success;
  }

  async userInputBreakdownTaskAsync(
    request: ChatRequest,
    token: CancellationToken
  ): Promise<null | {
    host: string;
    shouldContinue: boolean;
    customFunctions: boolean;
    data: string[];
  }> {
    const defaultSystemPrompt = `
    Role:
    You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins.

    Context:
    User ask about how to automate a certain process or accomplish a certain task using Office JavaScript Add-ins.

    Your task:
    You should only handle tasks about generate TypeScript code for Office Add-ins. If the user's ask is not relevate to Office Add-ins, you should reject the request, by setting the "shouldContinue" field to false. For example, if the user ask about how to automate a certain process or accomplish a certain task using VBA, you should reject the request. Another example is that if the user ask to generate web page code, or style sheet code, you should also reject the request. List your rejection reason in the "data" field of the output JSON object as a string array.
    Meanwhile, if the user's request is not clear, and you can't make a recommendation based on the context to cover those missing information. List the missing information, and ask for clarification. Put your ask and missing information into the "data" field of the output JSON object. The "shouldContinue" field should be false.
    Otherwise, break down the task into sub tasks could be performed by Office add-in JavaScript APIs, those steps should be only relevant to code. Put the list of sub tasks into the "data" field of the output JSON object. A "shouldContinue" field should be true.
    You must strickly follow the format of output.

    The format of output:
    The output should be a JSON object, with a key named "host", that value is a string to indicate which Office application is the most relevant to the user's ask. You can pick from "Excel", "Word", "PowerPoint". The second key is "shouldContinue", the value is a Boolean; and the third key named "data", the value of it is the list of sub tasks or missing information, and that is a string array; the last key named "customFunctions", set value of it to be a Boolean true if the user's ask is about Office JavaScript Add-ins with custom functions on Excel, otherwise, set it to be a Boolean false.
    If the value of "shouldContinue" is true, then the value of "data" should be the list of sub tasks; if the value of "shouldContinue" is false, then the value of "data" should be the list of missing information or reason to reject. Beyond this JSON object, you should not add anything else to the output.

    Think about that step by step.
    `;

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatUserMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(request.prompt),
    ];
    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-3.5-turbo",
      messages,
      token
    );
    let copilotRet = {
      host: "",
      shouldContinue: false,
      customFunctions: false,
      data: [],
    };

    try {
      copilotRet = JSON.parse(copilotResponse.trim());
    } catch (error) {
      console.error("[User task breakdown] Failed to parse the response from Copilot:", error);
      return null;
    }

    return copilotRet;
  }

  async generateCode(
    request: ChatRequest,
    token: CancellationToken,
    host: string,
    subTasks: string[]
  ) {
    let defaultSystemPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

# Your role:
You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on JavaScript, CSS, HTML, popular algorithm, and Office Add-ins API. You should help the user to automate a certain process or accomplish a certain task using Office JavaScript Add-ins.

# Context:
The user ask could be broken down into a few steps able to be accomplished by Office Add-ins JavaScript APIs. You have the list of steps.:
${subTasks.map((task, index) => `${index + 1}. ${task}`).join("\n")}

# Your tasks:
**Implement all mentioned step with code**, while follow the coding rule.

${getCodeGenerateGuidance(host)}

# Format of output:
**You must strickly follow the format of output**. The output will only contains code without any explanation on the code or generate process. Beyond that, nothing else should be included in the output.
- The code surrounded by a pair of triple backticks, and must follow with a string "typescript". For example:
\`\`\`typescript
// The code snippet
\`\`\`

    `;

    // Then let's query if any code examples relevant to the user's ask that we can put as examples
    const scenarioSamples =
      await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodes(
        request,
        token,
        host,
        request.prompt,
        1
      );
    if (scenarioSamples.size > 0) {
      const codeSnippets: string[] = [];
      scenarioSamples.forEach((sample, api) => {
        codeSnippets.push(`- ${sample.description}:
                              \`\`\`typescript
                              ${compressCode(sample.codeSample)}
                              \`\`\`\n`);
      });

      if (codeSnippets.length > 0) {
        defaultSystemPrompt = defaultSystemPrompt.concat(
          `\n\nCode samples:\n${codeSnippets.join("\n")}\n`
        );
      }
    }

    defaultSystemPrompt.concat(`\n\nLet's think step by step.`);

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatUserMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(request.prompt),
    ];
    // The GPT-4 model is significantly slower than GPT-3.5-turbo, but also significantly more accurate
    // In order to avoid waste more time on the correct, I believe using GPT-4 is a better choice
    const copilotResponse = await getCopilotResponseAsString("copilot-gpt-4", messages, token);

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

    return codeSnippetRet[1].trim();
  }
}
