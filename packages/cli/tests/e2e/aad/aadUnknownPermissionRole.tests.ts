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

describe("aadPermissionErrors", function () {
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

  it(`AAD: UnknownPermissionRole`, async function () {
    await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

    {
      // update permission

      const permission = '[{"resource":"Microsoft Graph","roles": ["User.ReadData"}]';

      await fs.writeJSON(`${projectPath}/permission.json`, permission, { spaces: 4 });
    }

    // provision

    try {
      await execAsync(`teamsfx provision --subscription ${subscription}`, {
        cwd: projectPath,

        env: process.env,

        timeout: 0,
      });
    } catch (error) {
      expect(error.toString()).to.contains("UnknownPermissionRole");
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
