// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { promises } from "fs";
import { join } from "path";
import { transpile } from "typescript";
import { ILocalPromptTuningConfigurations } from "./types";

export async function loadConfig() {
  const startTime = new Date();
  const configFilePath = join(
    __dirname,
    "../../../../../test/chat/mocks/localTuning/localPromptTuningConfig.ts"
  );

  try {
    const configFileContent = await promises.readFile(configFilePath, "utf-8");
    const tsCode = configFileContent.replace(/import\s.+;/g, "");
    const jsCode = transpile(tsCode);

    const config = eval(jsCode) as ILocalPromptTuningConfigurations;

    const outputDir = join(config.outputDir, startTime.getTime().toString());
    await promises.mkdir(outputDir, { recursive: true });
    await promises.copyFile(configFilePath, join(outputDir, "config.ts"));

    return {
      config,
      outputDir,
    };
  } catch (e) {
    // TODO: check the configFilePath is valid or not
    debugger;
    throw e;
  }
}
