// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, SimpleAuthValidator } from "../../commonlib";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Provision", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: Provision SimpleAuth with different pricing tier - Test Plan ID 9576788`, async function() {
    // set env
    process.env.SIMPLE_AUTH_SKU_NAME = "D1";

    // new a project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    // provision
    await execAsync(
      `teamsfx provision --subscription ${subscription}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Simple Auth
    const simpleAuth = SimpleAuthValidator.init(context);
    await SimpleAuthValidator.validate(simpleAuth, aad, "D1");

    // deploy
    await execAsync(
      `teamsfx deploy frontend-hosting`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
