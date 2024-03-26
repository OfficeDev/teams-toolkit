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
import { compressCode } from "../Utils";
import { SampleProvider } from "../samples/sampleProvider";
import { getCodeGenerateGuidance } from "./codeGuidance";
import { ISkill } from "./iSkill"; // Add the missing import statement
import { Spec } from "./spec";
import { getCopilotResponseAsString } from "../../utils";

export class CodeGenerator implements ISkill {
  name: string;
  capability: string;

  constructor() {
    this.name = "Code Generator";
    this.capability = "Generate code";
  }

  public canInvoke(request: ChatRequest, spec: Spec): boolean {
    return !!request.prompt && request.prompt.length > 0;
  }

  public async invoke(
    languageModel: LanguageModelChatUserMessage,
    request: ChatRequest,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<Spec | null> {
    if (
      !!spec.appendix.host ||
      !!spec.appendix.codeTaskBreakdown ||
      (spec.appendix.codeTaskBreakdown as string[]).length == 0
    ) {
      const breakdownResult = await this.userInputBreakdownTaskAsync(request, token);

      if (!breakdownResult || !breakdownResult.shouldContinue) {
        // TODO: Add handling for this case
        return null;
      }

      spec.appendix.host = breakdownResult.host;
      spec.appendix.codeTaskBreakdown = breakdownResult.data;
    }

    let codeSnippet: string | null = "";
    // performance.mark(`CodeGenerator.GenerateCode: start.`);
    codeSnippet = await this.generateCode(
      request,
      token,
      spec.appendix.host,
      spec.appendix.codeTaskBreakdown
    );
    // performance.mark(`CodeGenerator.GenerateCode: end.`);
    // const codegenMeasureResult = performance.measure(
    //   `CodeGenerator.GenerateCode`,
    //   `CodeGenerator.GenerateCode: start.`,
    //   `CodeGenerator.GenerateCode: end.`
    // );
    // console.debug(
    //   `CodeGenerator.GenerateCode spend ${Math.ceil(codegenMeasureResult.duration / 1000)}s`
    // );

    if (!codeSnippet) {
      return null;
    }

    spec.appendix.codeSnippet = codeSnippet;
    return spec;
  }

  async userInputBreakdownTaskAsync(request: ChatRequest, token: CancellationToken) {
    const defaultSystemPrompt = `
    Role:
    You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins.

    Context:
    User ask about how to automate a certain process or accomplish a certain task using Office JavaScript Add-ins.

    Your task:
    Break down the task into sub tasks could be performed by Office add-in JavaScript APIs, those steps should be only relevant to code. Put the list of sub tasks into the "data" field of the output JSON object. A "shouldContinue" field should be true.
    Alternatively, if the user's request is not clear, and you can't make a recommendation based on the context to cover those missing information. List the missing information, and ask for clarification. Put your ask and missing information into the "data" field of the output JSON object. The "shouldContinue" field should be false.
    You must strickly follow the format of output.

    The format of output:
    The output should be a JSON object, with a key named "host", that value is a string to indicate which Office application is the most relevant to the user's ask. You can pick from "Excel", "Word", "PowerPoint". The second key is "shouldContinue", the value is a Boolean indicates if the ask is clear or not; and another key named "data", the value of it is the list of sub tasks or missing information, and that is a string array. If the value of "shouldContinue" is true, then the value of "data" should be the list of sub tasks; if the value of "shouldContinue" is false, then the value of "data" should be the list of missing information. Beyond this JSON object, you should not add anything else to the output.

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
    Your role:
    You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on JavaScript, CSS, HTML, popular algorithm, and Office Add-ins API.

    Context:
    The user ask is: ${request.prompt}. And that could be broken down into a few steps:
    ${subTasks.map((task, index) => `${index + 1}. ${task}`).join("\n")}

    Your tasks:
    Follow those steps write code to accomplish the user's ask. Your must follow the coding rule.

    ${getCodeGenerateGuidance(host)}

    Format of output:
    You must strickly follow the format of output. The output will only contains code without any explanation on the code or generate process. Beyond that, nothing else should be included in the output.
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
    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-3.5-turbo",
      messages,
      token
    );

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
