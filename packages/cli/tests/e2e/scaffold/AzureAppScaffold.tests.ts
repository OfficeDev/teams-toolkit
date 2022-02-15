// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import path from "path";
import { BotValidator, FrontendValidator, FunctionValidator } from "../../commonlib";

import { execAsync, getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";

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

  it(`Tab + Bot + Function in TypeScript`, async function () {
    const lang = "typescript";

    // new a project (tab + bot + function) in TypeScript
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities tab bot --azure-resources function --programming-language ${lang}`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    {
      await FrontendValidator.validateScaffold(projectPath, lang);
      await BotValidator.validateScaffold(projectPath, lang);
      await FunctionValidator.validateScaffold(projectPath, lang);
    }
  });
});
