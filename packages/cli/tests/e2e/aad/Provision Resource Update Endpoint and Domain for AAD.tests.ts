// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator } from "@microsoft/teamsfx-api";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
} from "../commonUtils";

describe("Provision", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: Update Domain and Endpoint for AAD - Test Plan Id 9576711`, async function() {
    // new a project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    {
      // set fx-resource-simple-auth.skuName as B1
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      context["fx-resource-aad-app-for-teams"]["endpoint"] = "https://dormainfortest.test";
      context["fx-resource-aad-app-for-teams"]["domain"] = "dormainfortest.test";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

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
    const aad = AadValidator.init(context);
    await AadValidator.validate(aad);
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
