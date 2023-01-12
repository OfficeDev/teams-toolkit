// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Jobs <ruhe@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import * as chai from "chai";
import * as fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import path from "path";
import { CliHelper } from "../../commonlib/cliHelper";
import { cleanUp, getTestFolder, getUniqueAppName } from "../commonUtils";

describe("teamsfx init debug", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  let mockedEnvRestore: RestoreFn | undefined;

  afterEach(async () => {
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
    await cleanUp(appName, projectPath, false, false, false);
  });

  beforeEach(async () => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
  });

  it(`teamsfx init debug (vscode + bot)`, { testPlanCaseId: 16774423 }, async function () {
    await CliHelper.initDebug(appName, testFolder, "vsc", "bot", undefined);
    const files = [
      ".vscode/launch.json",
      ".vscode/settings.json",
      ".vscode/tasks.json",
      "script/run.js",
      "teamsAppEnv/.env.local",
      "teamsapp.local.yml",
      "teamsapp.yml",
    ];
    for (const file of files) {
      const filePath = path.resolve(testFolder, file);
      chai.assert.isTrue(await fs.pathExists(filePath));
    }
  });
});
