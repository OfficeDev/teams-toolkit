// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import path from "path";
import * as fs from "fs";
import * as chai from "chai";
import { getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import { describe } from "mocha";
import { it } from "@microsoft/extra-shot-mocha";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Scaffold From Source Code", function () {
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

  it(`Assert env/.env.dev exists for v3`, async function () {
    if (!isV3Enabled()) {
      return;
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab, process.env);
    console.log(`[Successfully] scaffold tab project to ${projectPath}`);

    const envFilePath = path.join(projectPath, "env", ".env.dev");
    fs.access(envFilePath, fs.constants.F_OK, (err) => {
      chai.assert.isNull(err);
    });
  });
});
