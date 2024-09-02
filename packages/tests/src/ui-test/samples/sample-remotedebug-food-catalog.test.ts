// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import path from "path";
import os from "os";
import fs from "fs";
import { TemplateProject } from "../../utils/constants";
import { CaseFactory } from "./sampleCaseFactory";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";

class FoodCatalogTestCase extends CaseFactory {
  override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    // create folder for the test "/env/.env.dev"
    await sampledebugContext.createEnvFolder(
      sampledebugContext.projectPath,
      "env"
    );
    // create .env file
    const filePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}.user`
    );
    const envContent =
      "SECRET_TABLE_STORAGE_CONNECTION_STRING=crypto_8eaa370c338c7cd3e60acf8bff8dfd25ae9cc602ce325a75e15bf8bd60de0c55edcf8d8d2db87e9315d590887b6fd05983e80dd81aedaa2149a1c7abbdaa6dd71388e9d9ddf9234c79fa64e026fda755a8d593f9f4fb65f8534bd75d31a3d71db50865bed3f381862ca0cd517b376c0484c7b28293ec511cfeceb9a676f3f57c5034d672e607f064476fd23caa880b7805dae421635a8cb097290d53ce8cad142dd6be54f12d665554590e42229591dd09f685a3c9a6c293a1f688aba8540388cc2364993a9ca512f17d32baa8f391ff4d8efbd6275385e80b5c25cea4a321b98e42cd5af79fc9be9567635c365b33dbfb587fcdd13ba19f213b7f62412127a88df3152865eedce6bec495832f4bfb751da99253a19c86211a08bb6fbeb5";
    fs.writeFileSync(filePath, envContent);
  }
}

new FoodCatalogTestCase(
  TemplateProject.FoodCatalog,
  27851823,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  {
    skipInit: true,
    repoPath: "./resource/samples",
    testRootFolder: path.resolve(os.homedir(), "resource"),
  }
).test();
