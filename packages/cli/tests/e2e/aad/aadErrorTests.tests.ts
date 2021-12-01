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

describe("Aad Error Tests", function () {
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

  it(`AAD: AadGetAppError`, async function () {
    {
      // set fake object id in context

      if (isMultiEnvEnabled()) {
        const config = await fs.readJSON(
          environmentManager.getEnvConfigPath(environmentManager.getDefaultEnvName(), projectPath)
        );
        config["auth"] = {
          objectId: "fakeObjectid",
          clientId: "fakeClientId",
          clientSecret: "fakeClientSecret",
          accessAsUserScopeId: "fakeAccessAsUserScopeId",
        };
        await fs.writeJSON(
          environmentManager.getEnvConfigPath(environmentManager.getDefaultEnvName(), projectPath),
          config,
          { spaces: 4 }
        );

        setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
        const { stdout, stderr } = await execAsync(
          `teamsfx provision --subscription ${subscription}`,
          {
            cwd: projectPath,
            env: process.env,
            timeout: 0,
          }
        );
        expect(stderr.toString()).to.contains(
          "Failed in step: Update permission for Azure AD app. You need to go to Azure Protal and mannually update the permission"
        );
      } else {
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

        context["fx-resource-aad-app-for-teams"]["objectId"] = "fake";

        context["fx-resource-simple-auth"]["skuName"] = "B1";

        await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
        try {
          await execAsync(`teamsfx provision --subscription ${subscription}`, {
            cwd: projectPath,

            env: process.env,

            timeout: 0,
          });
        } catch (error) {
          expect(error.toString()).to.contains("AadGetAppError");
        }
      }
    }
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

  it(`AAD: UnknownPermissionScope`, async function () {
    if (isMultiEnvEnabled()) {
      setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      setSimpleAuthSkuNameToB1(projectPath);
    }

    {
      // update permission

      const permission = '[{"resource":"Microsoft Graph","scopes": ["User.ReadData"}]';

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
      expect(error.toString()).to.contains("UnknownPermissionScope");
    }
  });

  it(`AAD: UnknownPermissionRole`, async function () {
    if (isMultiEnvEnabled()) {
      setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      setSimpleAuthSkuNameToB1(projectPath);
    }

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

  it(`AAD: ParsePermissionError`, async function () {
    if (isMultiEnvEnabled()) {
      setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      setSimpleAuthSkuNameToB1(projectPath);
    }

    {
      // update permission

      const permission = '[{"resource":"Microsoft Graph","roles": ["User.ReadData"}';

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
      expect(error.toString()).to.contains("ParsePermissionError");
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
