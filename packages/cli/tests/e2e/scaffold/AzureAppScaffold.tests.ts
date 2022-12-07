// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import path from "path";
import { BotValidator, FrontendValidator, FunctionValidator } from "../../commonlib";
import { getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import { describe } from "mocha";
import { it } from "@microsoft/extra-shot-mocha";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Azure App Scaffold", function () {
  let testFolder: string;
  let appName: string;
  let projectPath: string;

  // Should succeed on the 3rd try
  this.retries(2);

  beforeEach(() => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    await cleanUpLocalProject(projectPath);
  });

  it(`Tab + Bot + Function in TypeScript`, { testPlanCaseId: 9863654 }, async function () {
    const lang = "typescript";

    await CliHelper.createProjectWithCapability(
      appName,
      testFolder,
      Capability.Tab,
      process.env,
      `--programming-language ${lang}`
    );
    console.log(`[Successfully] scaffold typescript tab project to ${projectPath}`);

    if (!isV3Enabled()) {
      // V3 does not support add features
      await CliHelper.addCapabilityToProject(projectPath, Capability.Notification);
      console.log(`[Successfully] add capability ${Capability.Notification}`);

      await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
      console.log(`[Successfully] add resource ${Resource.AzureFunction}`);
    }

    {
      if (isV3Enabled()) {
        await FrontendValidator.validateScaffoldV3(projectPath, lang);
      } else {
        await FrontendValidator.validateScaffold(projectPath, lang);
        await BotValidator.validateScaffold(projectPath, lang, "src");
        await FunctionValidator.validateScaffold(projectPath, lang);
      }
    }
  });
});
