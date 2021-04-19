// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";

import { AadValidator, deleteAadApp, MockAzureAccountProvider } from "fx-api";

import { execAsync, getTestFolder, getUniqueAppName } from "./commonUtils";

describe("Provision", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: Update Domain and Endpoint for AAD - Test Plan Id 9576711`, async function() {
    // new a project
    const newResult = await execAsync(`teamsfx new --app-name ${appName} --interactive false --verbose false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0
    });
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");

    {
      // set fx-resource-simple-auth.skuName as B1
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      context["fx-resource-aad-app-for-teams"]["endpoint"] = "https://dormainfortest.test";
      context["fx-resource-aad-app-for-teams"]["domain"] = "dormainfortest.test";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    // provision
    const provisionResult = await execAsync(
      `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --verbose false`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );
    expect(provisionResult.stdout).to.eq("");
    expect(provisionResult.stderr).to.eq("");

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

    // Validate Aad App
    const aad = AadValidator.init(context);
    await AadValidator.validate(aad);
  });

  this.afterAll(async () => {
    // delete aad app
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    await deleteAadApp(context);

    // remove resouce
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(`${appName}-rg`);

    // remove project
    await fs.remove(projectPath);
  });
});
