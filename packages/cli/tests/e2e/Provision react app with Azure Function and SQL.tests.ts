// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";

import { deleteAadApp, MockAzureAccountProvider, SqlValidator } from "fx-api";

import { execAsync, getTestFolder, getUniqueAppName } from "./commonUtils";
import AppStudioLogin from "../../src/commonlib/appStudioLogin";

describe("Provision to Azure with SQL", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision react app with Azure Function and SQL - Test Plan ID 9454227`, async function () {
    const ciEnabled = process.env.CI_ENABLED;
    if (!ciEnabled) {
      this.skip();
    }

    // new a project
    const newResult = await execAsync(`teamsfx new --app-name ${appName} --azure-resources function sql --interactive false --verbose false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0
    });
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");
    console.log("new");

    {
      // set fx-resource-simple-auth.skuName as B1
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    // provision
    const provisionResult = await execAsync(
      `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --sql-admin-name Abc123321 --sql-password Cab232332 --sql-confirm-password Cab232332 --verbose false`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );
    console.log("provision");

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    
    // Validate Aad App
    await SqlValidator.init(context);
    await SqlValidator.validateSql();

    console.log("validate SQL provision");
  });

  this.afterAll(async () => {
    // delete aad app
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
    await deleteAadApp(context, AppStudioLogin);

    // remove resouce
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(`${appName}-rg`);

    // remove project
    await fs.remove(projectPath);
  });
});
