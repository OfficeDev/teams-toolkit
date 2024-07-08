// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { promises } from "fs";
import * as path from "path";
import { loadConfig } from "./loadConfig";
import { LocalTuningScenarioHandler } from "./types";
import { isHarmful_new, isHarmful_old } from "./utilFunctions";

export const promptTest: LocalTuningScenarioHandler = async (request, context, response, token) => {
  const log = (message: string) => {
    response.progress(`${message}\n`);
  };

  log("Loading config");
  const { config, outputDir } = await loadConfig();
  log("Config loaded");

  const outputs: string[] = [];

  for (let i = 0; i < config.userPrompts.length; i++) {
    log(`Prompt [${i}] started.`);

    try {
      const prompt = config.userPrompts[i];
      const results = await Promise.all([
        isHarmful_new(config.dynamicPromptFormat, prompt, token),
        isHarmful_old(prompt, token),
      ]);

      const [newResult, oldResult] = results;
      if (!newResult || !oldResult) {
        outputs.push(`
>>>>>> Prompts[${i}] check failed. Old: "${oldResult.toString()}", New: "${newResult.toString()}"
Prompt:
${prompt}
`);
      }
    } catch (e) {
      let error = e as Error;
      if (!(e instanceof Error)) {
        error = new Error((e as Error)?.stack || (e as Error)?.message || "Unknown error");
      }

      outputs.push(`
>>>>>> Prompts[${i}] check runtime error: ${error.stack || error.message}
`);
    }
  }

  log("All prompts done.");

  const outputFilePath = path.join(outputDir, `prompt_check.txt`);
  await promises.writeFile(outputFilePath, outputs.join("\n"), { encoding: "utf-8" });

  log(`Log saved.`);
  response.markdown(`Check done. [View log](file:${outputFilePath})`);
};
