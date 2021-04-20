// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";

import { AadValidator, SimpleAuthValidator, deleteAadApp, MockAzureAccountProvider } from "fx-api";

import { execAsync, getTestFolder, getUniqueAppName } from "./commonUtils";
import AppStudioLogin from "../../src/commonlib/appStudioLogin";

describe("Provision", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: Provision SimpleAuth with different pricing tier - Test Plan ID 9576788`, async function() {
    // set env
    process.env.SIMPLE_AUTH_SKU_NAME = "D1";

    // new a project
    const newResult = await execAsync(`teamsfx new --app-name ${appName} --interactive false --verbose false`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0
    });
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");
    console.log("new");

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
    console.log("provision");

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Simple Auth
    const simpleAuth = SimpleAuthValidator.init(context);
    await SimpleAuthValidator.validate(simpleAuth, aad, "D1");

    // deploy
    const deployResult = await execAsync(
      `teamsfx deploy --deploy-plugin fx-resource-frontend-hosting --verbose false`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );
    expect(deployResult.stdout).to.eq("");
    expect(deployResult.stderr).to.eq("");
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
