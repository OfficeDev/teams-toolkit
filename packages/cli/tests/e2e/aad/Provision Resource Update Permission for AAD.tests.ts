// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator } from "../../commonlib";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  cleanUp,
} from "../commonUtils";

describe("Provision", function() {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision Resource: Update Permission for AAD - Test Plan Id 9729543`, async function() {
    // new a project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setSimpleAuthSkuNameToB1(projectPath);

    {
      // update permission
      const permission = "[{\"resource\":\"Microsoft Graph\",\"scopes\": [\"User.Read\",\"User.Read.All\"]}]";
      await fs.writeJSON(`${projectPath}/permission.json`, permission, { spaces: 4 });
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
    const expectedPermission = "[{\"resourceAppId\":\"00000003-0000-0000-c000-000000000000\",\"resourceAccess\": [{\"id\": \"e1fe6dd8-ba31-4d61-89e7-88639da4683d\",\"type\": \"Scope\"},{\"id\": \"a154be20-db9c-4678-8ab7-66f6cc099a59\",\"type\": \"Scope\"}]}]";
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

    // Validate Aad App
    const aad = AadValidator.init(context);
    await AadValidator.validate(aad, expectedPermission);
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
