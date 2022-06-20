// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Aocheng Wang <aochengwang@microsoft.com>
 */

import path from "path";

import { BotValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
} from "../commonUtils";
import { it } from "../../commonlib/it";

describe("Regression test for bug 14739454", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  const env = Object.assign({}, process.env);

  it("Add capability: command and response", async function () {
    const cmd = `teamsfx new --interactive false --app-name ${appName} --capabilities tab --programming-language typescript`;
    await execAsync(cmd, {
      cwd: testFolder,
      env: env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    // provision
    await execAsyncWithRetry(`teamsfx add command-and-response`, {
      cwd: projectPath,
      env: env,
      timeout: 0,
    });

    console.log(`[Successfully] add feature for ${projectPath}`);

    // Validate Bot scaffold
    await BotValidator.validateScaffold(projectPath, "typescript", "src");
  });

  this.afterEach(async () => {
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await cleanUp(appName, projectPath, false, true, false);
  });
});
