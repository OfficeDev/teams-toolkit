// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";

import { AadValidator, SimpleAuthValidator, deleteAadApp, MockAzureAccountProvider } from "fx-api";

import { execAsync, getTestFolder, getUniqueAppName } from "./commonUtils";

describe("Deploy to Azure", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`Deploy react app without Azure Function and SQL - Test Plan ID 9454296`, async function() {
    // new a project
    const newResult = await execAsync(
      `teamsfx new --app-name ${appName} --verbose false`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");

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

    // Validate Simple Auth
    const simpleAuth = SimpleAuthValidator.init(context);
    await SimpleAuthValidator.validate(simpleAuth, aad);

    // run npm install in tabs
    /// TODO: this should be removed. It's a bug of frontend
    try {
      const npmInstallResult = await execAsync(
        `npm install`,
        {
          cwd: path.resolve(projectPath, "tabs"),
          env: process.env,
          timeout: 0
        }
      );
      expect(npmInstallResult.stderr).to.eq("");
    } catch(e) {
      console.log(e);
      throw e;
    }

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
    await deleteAadApp(context);

    // remove resouce
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(`${appName}-rg`);

    // remove project
    await fs.remove(projectPath);
  });
});
