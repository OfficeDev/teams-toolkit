// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import ts = require("typescript");
import {
  CancellationToken,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatSystemMessage,
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
        spec.sections = breakdownResult.data;
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
    const userPrompt = `
    Assume this is a ask: "${request.prompt}". I need you help to analyze it, and give me your suggestion. Follow the guidance below:
    - If the ask is not able agent support fo Excel, Word, or PowerPoint, you should reject it because today this agent only support those Office host applications. And give the reason to reject the ask.
    - If the ask is **NOT JUST** asking for generate **TypeScript** or **JavaScript** code for Office Add-ins. You should reject it. And give the reason to reject the ask. For example, if part of the ask is about generating code of VBA, Python, HTML, CSS, or other languages, you should reject it. If that is not relevant to Office Add-ins, you should reject it. etc.
    - Otherwise, please think about if you can process the ask. 
      - If you cannot process the ask, you should reject it. And give me the reason to reject the ask.
      - If you can process the ask, you should break down the ask into sub steps that could be performed by Office Add-ins JavaScript APIs. Each step should be actions accomplished by using **code**. Emphasize the "Bold" part in the title.
    return the result in a JSON object.

    Think about that step by step.
    `;
    const defaultSystemPrompt = `
    The following content written using Markdown syntax, using "Bold" style to highlight the key information.

    #Role:
    You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins. You need to offer the user a suggestion based on the user's ask.

    #Your tasks:
    Repeat the user's ask, and then give your suggestion based on the user's ask. Follow the guidance below:
    If you suggested to accept the ask. Put the list of sub tasks into the "data" field of the output JSON object. A "shouldContinue" field on that JSON object should be true.
    If you suggested to reject the ask, put the reason to reject into the "data" field of the output JSON object. A "shouldContinue" field on that JSON object should be false.
    You must strickly follow the format of output.

    #The format of output:
    The output should be just a **JSON object**. You should not add anything else to the output
    - The first key named "host", that value is a string to indicate which Office application is the most relevant to the user's ask. You can pick from "Excel", "Word", "PowerPoint". 
    - The second key is "shouldContinue", the value is a Boolean.
    - The third key named "data", the value of it is the list of sub tasks or rejection reason, and that is a string array.
    - The last key named "customFunctions", set value of it to be a Boolean true if the user's ask is about Office JavaScript Add-ins with custom functions on Excel. Otherwise, set it to be a Boolean false.
    If the value of "shouldContinue" is true, then the value of "data" should be the list of sub tasks; if the value of "shouldContinue" is false, then the value of "data" should be the list of missing information or reason to reject. **Beyond this JSON object, you should not add anything else to the output**.

    Think about that step by step.
    `;

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(userPrompt),
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
    const userPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

# Your role:
You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on JavaScript, CSS, HTML, popular algorithm, and Office Add-ins API. You should help the user to automate a certain process or accomplish a certain task using Office JavaScript Add-ins.

# Context:
This is the ask need your help to generate the code for this request:
- ${request.prompt}. 
The request is about Office Add-ins, and it is relevant to the Office application "${host}".
It could be broken down into a few steps able to be accomplished by Office Add-ins JavaScript APIs. You have the list of steps.:
${subTasks.map((task, index) => `${index + 1}. ${task}`).join("\n")}

# Your tasks:
Implement **all** mentioned step with **TypeScript code** and **Office JavaScript Add-ins API**.
    `;
    let defaultSystemPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

# Your tasks:
Implement **all** mentioned step with **TypeScript code** and **Office JavaScript Add-ins API**, while **follow the coding rule**.

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
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(userPrompt),
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
