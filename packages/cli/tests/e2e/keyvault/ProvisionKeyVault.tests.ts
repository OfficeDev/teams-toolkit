// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Jun Han <junhan@microsoft.com>
 */

import fs from "fs-extra";
import path from "path";

import { AadValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { environmentManager } from "@microsoft/teamsfx-core";
import { KeyVaultValidator } from "../../commonlib/keyVaultValidator";

describe("Test Azure Key Vault", function () {
  let testFolder: string;
  let appName: string;
  let subscription: string;
  let projectPath: string;

  beforeEach(() => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    subscription = getSubscriptionId();
    projectPath = path.resolve(testFolder, appName);
  });

  it(`Provision Azure Key Vault`, async function () {
    // new a project
    await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);

    setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

    // add Azure Function
    await execAsync(`teamsfx resource add azure-function --function-name func1`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`[Successfully] add Function to ${projectPath}`);

    // add Key Vault
    await execAsync(`teamsfx resource add azure-keyvault`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`[Successfully] add Key Vault to ${projectPath}`);

    // provision
    await execAsyncWithRetry(`teamsfx provision --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    console.log(`[Successfully] provision for ${projectPath}`);

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

    // Validate Aad App
    const aad = AadValidator.init(context, false, AppStudioLogin);
    await AadValidator.validate(aad);

    // Validate Key Vault
    const keyVault = KeyVaultValidator.init(context);
    await KeyVaultValidator.validate(keyVault);
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false, true);
  });
});
