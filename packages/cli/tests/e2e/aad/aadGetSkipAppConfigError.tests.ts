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
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";

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

  it(`AAD: GetSkipAppConfigError`, async function () {
    if (isMultiEnvEnabled()) {
      // Insider preview does not use skipProvision
      return;
    }
    // set skip flag in context
    {
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

      context["fx-resource-aad-app-for-teams"]["skipProvision"] = true;

      context["fx-resource-simple-auth"]["skuName"] = "B1";

      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    // provision

    try {
      await execAsync(`teamsfx provision --subscription ${subscription}`, {
        cwd: projectPath,

        env: process.env,

        timeout: 0,
      });
    } catch (error) {
      expect(error.toString()).to.contains("GetSkipAppConfigError");
    }
  });

  afterEach(async () => {
    // clean up
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, false, false, true);
    } else {
      await cleanUp(appName, projectPath, true, false, false);
    }
  });
});
