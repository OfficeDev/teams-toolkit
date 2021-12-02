// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { BotValidator, FrontendValidator, FunctionValidator } from "../../commonlib";

import { execAsync, getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";

describe("Azure App Scaffold", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  // Should succeed on the 3rd try
  this.retries(2);

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
      FrontendValidator.validateScaffold(projectPath, lang);
      FunctionValidator.validateScaffold(projectPath, lang);
      BotValidator.validateScaffold(projectPath, lang);
    }
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
