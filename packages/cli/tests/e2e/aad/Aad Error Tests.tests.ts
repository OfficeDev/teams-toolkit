// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import { expect } from "chai";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
} from "../commonUtils";

describe("Aad Error Tests", function() {
  let testFolder: string;
  let appName: string;
  let subscription: string;
  let projectPath: string;

  beforeEach(async () => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    subscription = getSubscriptionId();
    projectPath = path.resolve(testFolder, appName);

    // new a project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);
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
      await execAsync(
        `teamsfx provision --subscription ${subscription}`,
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
      await execAsync(
        `teamsfx provision --subscription ${subscription}`,
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
      await execAsync(
        `teamsfx provision --subscription ${subscription}`,
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
      await execAsync(
        `teamsfx provision --subscription ${subscription}`,
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
      await execAsync(
        `teamsfx provision --subscription ${subscription}`,
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

  afterEach(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
