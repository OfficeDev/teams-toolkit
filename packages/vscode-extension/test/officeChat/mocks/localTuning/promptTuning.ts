// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { promises } from "fs";
import { join } from "path";
import { LanguageModelChatMessage, LanguageModelChatMessageRole } from "vscode";
import { buildDynamicPrompt } from "../../../../src/officeChat/dynamicPrompt";
import { loadConfig } from "./loadConfig";
import { LocalTuningScenarioHandler } from "./types";
import { getCopilotResponseAsString } from "./utilFunctions";

export const promptTuning: LocalTuningScenarioHandler = async (
  request,
  context,
  response,
  token
) => {
  const log = (message: string) => {
    response.progress(`${message}\n`);
  };

  log("Starting prompt tuning");
  const { config, outputDir } = await loadConfig();

  log("Config loaded");
  await Promise.all(
    config.userPrompts.map(async (userPrompt, textIndex) => {
      const startTime = new Date();
      const messages = buildDynamicPrompt(config.dynamicPromptFormat, userPrompt).messages;

      const outputs = await Promise.all(
        Array(config.callCount)
          .fill(0)
          .map(async (_, index) => {
            const output = await getCopilotResponseAsString("copilot-gpt-4", messages, token);

            log(`Prompt[${textIndex}] - ${index + 1}/${config.callCount} done.`);

            return output;
          })
      );

      log(`Prompt[${textIndex}] - all done.`);

      const promptOutput = [
        `Start time: ${startTime.toISOString().replace(/:/g, "-")}\n`,
        `Full prompts: ${messages
          .map(
            (message) => `<|im_start|>${getMessageType(message)}\n${message.content}\n<|im_end|>`
          )
          .join("\n")}\n\n`,
        ...outputs.map(
          (output, index) => `>>>>>>>> Output[${index}/${config.callCount}]:\n${output}\n`
        ),
      ];

      const outputFilePath = join(outputDir, `prompt_${textIndex}.txt`);
      await promises.writeFile(outputFilePath, promptOutput.join("\n"), { encoding: "utf-8" });

      log(`Prompt[${textIndex}] - log saved.`);
      response.markdown(`Prompt[${textIndex}] done. [View log](file:${outputFilePath})`);
    })
  );

  log("All prompts done.");
};

function getMessageType(message: LanguageModelChatMessage) {
  if (message.role === LanguageModelChatMessageRole.System) {
    return "system";
  } else if (message.role === LanguageModelChatMessageRole.User) {
    return "user";
  } else if (message.role === LanguageModelChatMessageRole.Assistant) {
    return "assistant";
  } else {
    return "unknown";
  }
}
