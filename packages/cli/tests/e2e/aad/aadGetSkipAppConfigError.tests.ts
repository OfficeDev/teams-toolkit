// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowen.song@microsoft.com>
 */

import fs from "fs-extra";

import path from "path";

import { expect } from "chai";

import { describe, it } from "mocha";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  setSimpleAuthSkuNameToB1,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";

describe("aadGetSkipAppConfigError", function () {
  let testFolder: string;

  let appName: string;

  let subscription: string;

  let projectPath: string;

  this.retries(3);

  beforeEach(async () => {
    testFolder = getTestFolder();

    appName = getUniqueAppName();

    subscription = getSubscriptionId();

    projectPath = path.resolve(testFolder, appName);

    // new a project

    await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
      cwd: testFolder,

      env: process.env,

      timeout: 0,
    });

    console.log(`[Successfully] scaffold to ${projectPath}`);
  });

  afterEach(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
