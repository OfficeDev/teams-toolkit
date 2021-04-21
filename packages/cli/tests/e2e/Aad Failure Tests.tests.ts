// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";

import { MockAzureAccountProvider } from "fx-api";

import { execAsync, getTestFolder, getUniqueAppName } from "./commonUtils";

describe("Aad Failure Tests", function() {
  let testFolder: string;
  let appName: string;
  let projectPath: string;

  this.beforeEach(async () => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);

    // new a project
    const newResult = await execAsync(`teamsfx new --app-name ${appName} --interactive false --verbose false`, {
        cwd: testFolder,
        env: process.env,
        timeout: 0
    });
    expect(newResult.stdout).to.eq("");
    expect(newResult.stderr).to.eq("");
  });

  it(`AAD: AadGetAppError`, async function() {
    {
      // set fake object id in context
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-aad-app-for-teams"]["objectId"] = "fake";
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    // provision
    try {
        const provisionResult = await execAsync(
            `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --verbose false`,
            {
              cwd: projectPath,
              env: process.env,
              timeout: 0
            }
        );
    } catch (error) {
        expect(error.toString()).to.contains("AadGetAppError");
    }
  });

  it(`AAD: GetSkipAppConfigError`, async function() {
    {
      // set skip flag in context
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-aad-app-for-teams"]["skipProvision"] = true;
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    // provision
    try {
        const provisionResult = await execAsync(
            `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --verbose false`,
            {
              cwd: projectPath,
              env: process.env,
              timeout: 0
            }
        );
    } catch (error) {
        expect(error.toString()).to.contains("GetSkipAppConfigError");
    }
  });

  it(`AAD: UnknownPermissionScope`, async function () {
    {
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    {
      // update permission
      const permission = "[{\"resource\":\"Microsoft Graph\",\"scopes\": [\"User.ReadData\"}]";
      await fs.writeJSON(`${projectPath}/permission.json`, permission, { spaces: 4 });
    }

    // provision
    try {
      const provisionResult = await execAsync(
          `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --verbose false`,
          {
            cwd: projectPath,
            env: process.env,
            timeout: 0
          }
      );
    } catch (error) {
        expect(error.toString()).to.contains("UnknownPermissionScope");
    }
  });

  it(`AAD: UnknownPermissionRole`, async function () {
    {
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    {
      // update permission
      const permission = "[{\"resource\":\"Microsoft Graph\",\"roles\": [\"User.ReadData\"}]";
      await fs.writeJSON(`${projectPath}/permission.json`, permission, { spaces: 4 });
    }

    // provision
    try {
      const provisionResult = await execAsync(
          `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --verbose false`,
          {
            cwd: projectPath,
            env: process.env,
            timeout: 0
          }
      );
    } catch (error) {
        expect(error.toString()).to.contains("UnknownPermissionRole");
    }
  });

  it(`AAD: ParsePermissionError`, async function () {
    {
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
      context["fx-resource-simple-auth"]["skuName"] = "B1";
      await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
    }

    {
      // update permission
      const permission = "[{\"resource\":\"Microsoft Graph\",\"roles\": [\"User.ReadData\"}";
      await fs.writeJSON(`${projectPath}/permission.json`, permission, { spaces: 4 });
    }

    // provision
    try {
      const provisionResult = await execAsync(
          `teamsfx provision --subscription 1756abc0-3554-4341-8d6a-46674962ea19 --verbose false`,
          {
            cwd: projectPath,
            env: process.env,
            timeout: 0
          }
      );
    } catch (error) {
        expect(error.toString()).to.contains("ParsePermissionError");
    }
  });

  this.afterEach(async () => {
    // remove resouce
    await MockAzureAccountProvider.getInstance().deleteResourceGroup(`${appName}-rg`);

    // remove project
    await fs.remove(projectPath);
  });
});
