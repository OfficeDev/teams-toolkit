// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { promises } from "fs";
import { transpile } from "typescript";
import { buildDynamicPrompt } from "../dynamicPrompt";
import { generatePhrases, getCopilotResponseAsString } from "../utils";
import { ILocalPromptTuningConfigurations, LocalTuningScenarioHandler } from "./types";
import path = require("path");

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
  const config = await loadConfig();

  log("Config loaded");
  await Promise.all(
    config.userPrompts.map(async (userPrompt, textIndex) => {
      const phases = generatePhrases(userPrompt);
      const messages = buildDynamicPrompt(
        "inputRai",
        phases,
        config.dynamicPromptSettings
      ).messages;

      const outputs = await Promise.all(
        Array(config.callCount)
          .fill(0)
          .map(async (_, index) => {
            const output = await getCopilotResponseAsString("copilot-gpt-4", messages, token);

            log(`Prompt[${textIndex}] - ${index + 1}/${config.callCount} done.`);

            return output;
          })
      );

      log(`Prompt[${textIndex}] - all done.
**Prompt**:
[
  ${messages.map((message) => `"${message.content}"`).join(",\n")}
]

Outputs:
${outputs.map((output, index) => `**[${index}]**:\n${output}`).join("\n")}
`);
    })
  );
};

async function loadConfig() {
  const configFilePath = path.join(
    __dirname,
    __dirname.endsWith("src") ? "" : "../..",
    "../../test/chat/mocks/localPromptTuningConfig.ts"
  );
  const configFileContent = await promises.readFile(configFilePath, "utf-8");
  const tsCode = configFileContent.replace(/import\s.+;/g, "");
  const jsCode = transpile(tsCode);

  return eval(jsCode) as ILocalPromptTuningConfigurations;
}
