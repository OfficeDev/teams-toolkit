// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { environmentManager } from "@microsoft/teamsfx-core";
import path from "path";
import "chai";
import { BotValidator, FrontendValidator, FunctionValidator } from "../../commonlib";
import { provisionParametersKey } from "../../commonlib/constants";

import {
  execAsync,
  getTestFolder,
  getUniqueAppName,
  cleanUpLocalProject,
  getActivePluginsFromProjectSetting,
  getProvisionParameterValueByKey,
} from "../commonUtils";

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
      FrontendValidator.validateScaffold(projectPath, lang);
      BotValidator.validateScaffold(projectPath, lang);

      const activeResourcePlugins = await getActivePluginsFromProjectSetting(projectPath);
      chai.assert.isArray(activeResourcePlugins);
      const resourceBaseName: string = await getProvisionParameterValueByKey(
        projectPath,
        environmentManager.getDefaultEnvName(),
        provisionParametersKey.resourceBaseName
      );
      const functionValidator = new FunctionValidator(
        context,
        activeResourcePlugins as string[],
        resourceBaseName
      );
      await functionValidator.validateScaffold(projectPath, lang);
    }
  });
});
