// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import ts = require("typescript");
import {
  CancellationToken,
  ChatResponseStream,
  LanguageModelChatAssistantMessage,
  LanguageModelChatMessage,
  LanguageModelChatSystemMessage,
  LanguageModelChatUserMessage,
} from "vscode";
import { correctPropertyLoadSpelling } from "../Utils";
import { SampleProvider } from "../samples/sampleProvider";
import { getCodeGenerateGuidance } from "./codeGuidance";
import { ISkill } from "./iSkill"; // Add the missing import statement
import { Spec } from "./spec";
import { countMessageTokens, countMessagesTokens, getCopilotResponseAsString } from "../../utils";
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
import { excelSystemPrompt, customFunctionSystemPrompt } from "../../officeAddinPrompts";

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
    let progressMessageStr = "generating code...";
    if (spec.appendix.complexity >= 50) {
      progressMessageStr =
        progressMessageStr + "This is a task with high complexity, may take a little bit longer...";
    } else {
      progressMessageStr =
        progressMessageStr + "We should be able to generate the code in a short while...";
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
    const userPrompt = `
  # Role:
  You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins. You need to offer the user a suggestion based on the user's ask.

  # Your tasks:
  For this given ask: "${spec.userInput}" to you. I need you help to analyze it, and give me your suggestion. 

  Please share your suggestion based on the given ask to me.

  Think about that step by step.
  `;
    const defaultSystemPrompt = `
  The following content written using Markdown syntax, using "Bold" style to highlight the key information.

  # Role:
  You are an expert in Office JavaScript Add-ins, and you are familiar with scenario and the capabilities of Office JavaScript Add-ins. You need to offer the user a suggestion based on the user's ask.

  # Context:
  The output will be a JSON object, and it will contain the following keys:
  - host. value is a string.
  - shouldContinue. value is a Boolean.
  - data. value is a string array.
  - complexity. value is a number.
  - customFunctions. value is a Boolean.

  # Your tasks:
  Repeat the user's ask, make sure you give user suggestion based on the guidance below:
  1. Check if should accept the ask or reject it, by using the following criteria:
    - If the ask is not relevant to Microsoft Excel, Microsoft Word, or Microsoft PowerPoint, you should reject it because today this agent only support offer assistant to those Office host applications. And give the reason to reject the ask.
    - If the ask is not about automating a certain process or accomplishing a certain task using Office JavaScript Add-ins, you should reject it. And give the reason to reject the ask.
    - If the ask is **NOT JUST** asking for generate **TypeScript** or **JavaScript** code for Office Add-ins. You should reject it. And give the reason to reject the ask. For example, if part of the ask is about generating code of VBA, Python, HTML, CSS, or other languages, you should reject it. If that is not relevant to Office Add-ins, you should reject it. etc.
    - If the ask is about generate content beyond the code, you should reject it. And give the reason to reject the ask. For example, if the ask is about generate a document, a noval, a word document content, a powerpoint slide content, etc. you should reject it.
    - If you cannot process the ask, you should reject it. And give me the reason to reject the ask.
    - Otherwise, treat you will accept that ask. 
  2. Only If you can process the ask, follow the steps below for offering the suggestion:
    1. Identify the user ask if it explicitly asks for custom functions:
      - set the value of "customFunctions" field of output object to be "true" if the ask is about custom functions
      - set the value of "customFunctions" field of output object to be "false" if the ask is not about custom functions
    2. Identify a "complexity" score, the value of it is a number to indicate the complexity of the user's ask. The number should be between 1 to 100, 1 means the ask is very simple, 100 means the ask is very complex. Set this score into the "complexity" field of the output JSON object.
    This is the rule to calculate the complexity:
    - If there's no interaction with Office JavaScript Add-ins API, set the score range from very simple to simple. If maps to score, that coulld be (1, 25).
    - If there's a few interaction (less than 5) with Office JavaScript Add-ins API, set the score range from simple to medium. If maps to score, that coulld be (26, 50).
    - If there's several interaction (more than or equals to 5, less than 8) with Office JavaScript Add-ins API, set the score range from medium to complex. If maps to score, that coulld be (51, 75).
    - If there's many interaction (more than or equals to 8) with Office JavaScript Add-ins API, set the score range from complex to very complex. If maps to score, that coulld be (76, 100).
    2. If this is a complex task, that the "complexity score" greater than 50, break it down into several steps present as TypeScript functions. For each function, give a one line function description, that should have a briefly description of what the function should do, what parameters it should take, and what it should return. Add those function descriptions to the "data" field of the output JSON object.
      - bypass step like "create a new Office Add-ins project" or "create a new Excel workbook" or "create a new Word document" or "create a new PowerPoint presentation".
      - bypass step like "open the workbook" or "open the document" or "open the presentation".
      - bypass step like "save the workbook" or "save the document" or "save the presentation".
      - bypass step like the "generate Addins Code" or "generate xxx Code".
      - bypass step like "Use the Office JavaScript Add-ins API to perform the required operations".
      - bypass step like "Register the xxx function".
    3. If this is a simple task, that the "complexity score" less than 50, generate a single one line function description for this task without any break down, and put that description into the "data" field.
    4. Check the value of output object's "customFunctions" field:
      - If the value is "true", you should not include the entry function description in the "data" field.
      - If the value is "false", you should include the entry function description in the "data" field. The entry function description should summarize how other functions be called in what order. The entry function must named as "main", and takes no parameters, declared as 'async function'.
    5. Identify and set the "host" property of the output JSON object, that value is a string to indicate which Office application is the most relevant to the user's ask. You can pick from "Excel", "Word", "PowerPoint". 

    Following are some Examples:
    1. This is an example of the list that ask is not about custom functions, it must contains a entry function descriptions named 'main':
      - Create a function named 'createTrendlineChart'. This function should take the 'Excel.Worksheet' and the range values as parameters. It should create a trendline chart in the worksheet where dates are set as the x-value and prices as the y-value. Return a Promise<Excel.Chart> object.
      - Create an entry function named 'main'. This function doesn't take any parameters and will call 'createTrendlineChart' to create a trendline chart in worksheet. The function should be declared as 'async function'.
    2. This is an example of the list that ask about custom functions, it must not contains the entry function descriptions:
      - Create a custom functions named 'addSum'. This function should take two number values as parameters. Return the Promise<number> object. The function should be declared as 'async function'.
  
  If you suggested to accept the ask. Put the list of function description into the "data" field of the output JSON object. A "shouldContinue" field on that JSON object should be true.
  If you suggested to reject the ask, put the reason to reject into the "data" field of the output JSON object. A "shouldContinue" field on that JSON object should be false.
  You must strickly follow the format of output.

  #The format of output:
  The output should be just a **JSON object**. You should not add anything else to the output

  Think about that step by step.
  `;

    // Perform the desired operation
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatSystemMessage(defaultSystemPrompt),
      new LanguageModelChatUserMessage(userPrompt),
      new LanguageModelChatAssistantMessage("```json\n"),
    ];
    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-3.5-turbo", // "copilot-gpt-4",
      messages,
      token
    );
    let copilotRet = {
      host: "",
      shouldContinue: false,
      customFunctions: false,
      complexity: 0,
      data: [],
    };

    try {
      if (!copilotResponse) {
        return null; // The response is empty
      }
      const codeSnippetRet = copilotResponse.match(/([\s\S]*?)```/);
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
        return task.includes("'main'");
      })
    ) {
      console.debug(
        `[User task breakdown] The entry function 'main' is missing from task breakdown.`
      );
      return null;
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
    const userPrompt = `
The following content written using Markdown syntax, using "Bold" style to highlight the key information.

# Your role:
You're a professional and senior Office JavaScript Add-ins developer with a lot of experience and know all best practice on TypeScript, JavaScript, popular algorithm, Office Add-ins API, and deep understanding on the feature of Office applications (Word, Excel, PowerPoint). You should help the user to automate a certain process or accomplish a certain task, by generate TypeScript code using Office JavaScript Add-ins.

# Context:
This is the ask need your help to generate the code for this request: ${spec.userInput}.
- The request is about Office Add-ins, and it is relevant to the Office application "${host}".
- It's a suggested list of functions with their purpose and details. **Read through those descriptions, and repeat by yourself**. Make sure you understand that before go to the task:
${suggestedFunction.map((task) => `- ${task}`).join("\n")}

# Your tasks:
Generate code for each listed functions based on the user request, the generated code **MUST** include implementations of those functions listed above, and not limited to this. Code write in **TypeScript code** and **Office JavaScript Add-ins API**, while **follow the coding rule**. Do not generate code to invoke the "main" function or "entry" function if that function generated.

${getCodeGenerateGuidance(host)}

# Format of output:
**You must strickly follow the format of output**. The output will only contains code without any explanation on the code or generate process. Beyond that, nothing else should be included in the output.
- The code surrounded by a pair of triple backticks, and must follow with a string "typescript". For example:
\`\`\`typescript
// The code snippet
\`\`\`

Let's think step by step.
    `;
    spec.appendix.telemetryData.properties[PropertySystemCodeGenTargetedOfficeHostApplication] =
      host;
    spec.appendix.telemetryData.properties[PropertySystemCodeGenIsCustomFunction] =
      isCustomFunctions.toString();
    let samplesPrompt = `
    The following content written using Markdown syntax, using "Bold" style to highlight the key information.

    # There're some samples relevant to the your's ask, you can read it and repeat by yourself, before start to generate code.
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

    // Then let's query if any code examples relevant to the user's ask that we can put as examples
    const scenarioSamples =
      await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodes(
        token,
        host,
        spec.userInput,
        2 // Get top 2 most relevant samples for now
      );
    if (scenarioSamples.size > 0) {
      const codeSnippets: string[] = [];
      scenarioSamples.forEach((sample, api) => {
        console.debug(`[Code generation] Sample matched: ${sample.description}`);
        codeSnippets.push(`- ${sample.description}:
                              \`\`\`typescript
                              ${sample.codeSample}
                              \`\`\`\n`);
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
    const messages: LanguageModelChatMessage[] = [
      new LanguageModelChatSystemMessage(referenceUserPrompt),
      new LanguageModelChatUserMessage(userPrompt),
    ];
    const sampleMessage: LanguageModelChatSystemMessage = new LanguageModelChatSystemMessage(
      samplesPrompt
    );
    const sampleMsgCount = countMessageTokens(sampleMessage);
    const msgCount = countMessagesTokens(messages);
    console.log(`token count: ${msgCount + sampleMsgCount}`);
    if (msgCount + sampleMsgCount < 3500) {
      messages.push(sampleMessage);
    }

    const copilotResponse = await getCopilotResponseAsString(
      "copilot-gpt-4", // "copilot-gpt-3.5-turbo", // "copilot-gpt-4",
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

    return correctPropertyLoadSpelling(codeSnippetRet[1].trim());
  }
}
