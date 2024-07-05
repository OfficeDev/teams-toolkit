// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 */

import { describe } from "mocha";
import { expect } from "chai";
import * as path from "path";

import { it } from "@microsoft/extra-shot-mocha";
import * as fs from "fs-extra";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../utils/constants";
import {
  cleanUpLocalProject,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
} from "../commonUtils";
import { deleteTeamsApp } from "../debug/utility";

describe("Create Copilot plugin", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    // clean up
    const context = await readContextMultiEnvV3(projectPath, "dev");
    if (context?.TEAMS_APP_ID) {
      await deleteTeamsApp(context.TEAMS_APP_ID);
    }

    await cleanUpLocalProject(projectPath);
  });

  it(
    "happy path: scaffold",
    { testPlanCaseId: 27569845, author: "yuqzho@microsoft.com" },
    async function () {
      const env = Object.assign({}, process.env);

      env["API_COPILOT_PLUGIN"] = "true";
      env["DEVELOP_COPILOT_PLUGIN"] = "true";

      const apiSpecPath = path.join(__dirname, "../", "testApiSpec.yml");

      console.log(apiSpecPath);
      // create
      await CliHelper.createProjectWithCapability(
        appName,
        testFolder,
        Capability.CopilotPluginFromExistingAPI,
        env,
        `--openapi-spec-location ${apiSpecPath} --api-operation "DELETE /repairs,GET /repairs,PATCH /repairs"`
      );
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // check specified files
      const files: string[] = [
        "appPackage/ai-plugin.json",
        "appPackage/manifest.json",
      ];
      for (const file of files) {
        const filePath = path.join(testFolder, appName, file);
        expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
      }
    }
  );
});
