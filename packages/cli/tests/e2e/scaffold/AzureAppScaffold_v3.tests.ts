// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import path from "path";
import { BotValidator, FrontendValidator, FunctionValidator } from "../../commonlib";

import { execAsync, getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";

import { describe } from "mocha";
import { it } from "../../commonlib/it";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import mockedEnv from "mocked-env";
describe("Azure App Scaffold (V3)", function () {
  let testFolder: string;
  let appName: string;
  let projectPath: string;

  // Should succeed on the 3rd try
  this.retries(2);

  let mockedEnvRestore: () => void;
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_APIV3: "true",
    });
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    await cleanUpLocalProject(projectPath);
    mockedEnvRestore();
  });

  it(`Tab + Bot + Function in TypeScript (V3)`, { testPlanCaseId: 9863654 }, async function () {
    const lang = "typescript";

    await CliHelper.createProjectWithCapability(
      appName,
      testFolder,
      Capability.Tab,
      process.env,
      `--programming-language ${lang}`
    );
    console.log(`[Successfully] scaffold typescript tab project to ${projectPath}`);

    await CliHelper.addCapabilityToProject(projectPath, Capability.Notification);
    console.log(`[Successfully] add capability ${Capability.Notification}`);

    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    console.log(`[Successfully] add resource ${Resource.AzureFunction}`);

    {
      await FrontendValidator.validateScaffold(projectPath, lang);
      await BotValidator.validateScaffold(projectPath, lang, "src");
      await FunctionValidator.validateScaffold(projectPath, lang);
    }
  });
});
