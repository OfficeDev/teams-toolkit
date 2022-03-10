// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import path from "path";
import { BotValidator, FrontendValidator, FunctionValidator } from "../../commonlib";
import * as chai from "chai";

import { execAsync, getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import * as fs from "fs-extra";

describe("teamsfx init", function () {
  let testFolder: string;
  let appName: string;
  let projectPath: string;

  beforeEach(() => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    await cleanUpLocalProject(projectPath);
  });

  it(`should scaffold a basic project`, async function () {
    process.env["TEAMSFX_INIT_APP"] = "true";
    // new a project (tab + bot + function) in TypeScript
    await execAsync(
      `teamsfx init --interactive false --app-name ${appName} --folder ${testFolder}`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(`[Successfully] run teamsfx init to ${projectPath}`);
    const files = ["packge.json", "templates", ".fx"];
    for (const file of files) {
      chai.assert.isTrue(await fs.pathExists(path.resolve(projectPath, file)));
    }
  });
});
