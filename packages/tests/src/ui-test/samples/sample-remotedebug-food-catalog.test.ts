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
import { SampledebugContext } from "./sampledebugContext";

class FoodCatalogTestCase extends CaseFactory {
  override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev"
  ): Promise<void> {
    console.log("pre provision project");
    try {
      await sampledebugContext.provisionProject(
        sampledebugContext.appName,
        sampledebugContext.projectPath,
        true,
        "cli",
        "",
        "dev",
        process.env,
        "lifecycle provision because there are unresolved placeholders"
      );
    } catch (error) {}
    console.log("[start] update env file.");
    const envFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}.user`
    );
    let envContent = fs.readFileSync(envFilePath, "utf-8");
    console.log(`envContent: ${envContent}`);
    const storageConnectionString = fs
      .readFileSync(envFilePath, "utf-8")
      .split("\n")
      .find((line) =>
        line.startsWith("SECRET_STORAGE_ACCOUNT_CONNECTION_STRING")
      )
      ?.split("=")[1];
    console.log(`storageConnectionString: ${storageConnectionString}`);
    envContent += `\nSECRET_TABLE_STORAGE_CONNECTION_STRING=${storageConnectionString}`;
    fs.writeFileSync(envFilePath, envContent, { encoding: "utf-8" });
    console.log("[finish] env file updated.");
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
    skipDeploy: true,
    repoPath: "./resource/samples",
    testRootFolder: path.resolve(os.homedir(), "resource"),
  }
).test();
