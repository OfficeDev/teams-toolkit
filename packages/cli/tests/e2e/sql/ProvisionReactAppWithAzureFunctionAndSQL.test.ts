// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import path from "path";

import { SqlValidator } from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";

describe("Provision to Azure with SQL", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision react app with Azure Function and SQL`, async function () {
    // new a project ( tab + function + sql )
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities tab --azure-resources function sql`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    if (isMultiEnvEnabled()) {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setSimpleAuthSkuNameToB1(projectPath);
    }

    // provision
    await execAsyncWithRetry(
      `teamsfx provision --subscription ${subscription} --sql-admin-name Abc123321 --sql-password Cab232332`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );

    if (isMultiEnvEnabled()) {
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

      // Validate Aad App
      await SqlValidator.init(context);
      await SqlValidator.validateSql();
    } else {
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

      // Validate Aad App
      await SqlValidator.init(context);
      await SqlValidator.validateSql();
    }
  });

  after(async () => {
    // clean up
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, false, false, true);
    } else {
      await cleanUp(appName, projectPath, true, false, false);
    }
  });
});
