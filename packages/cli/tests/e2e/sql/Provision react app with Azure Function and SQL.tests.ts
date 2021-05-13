// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { SqlValidator } from "@microsoft/teamsfx-api";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  cleanUp,
} from "../commonUtils";

describe("Provision to Azure with SQL", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Provision react app with Azure Function and SQL - Test Plan ID 9454227`, async function () {
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

    await setSimpleAuthSkuNameToB1(projectPath);

    // provision
    await execAsync(
      `teamsfx provision --subscription ${subscription} --sql-admin-name Abc123321 --sql-password Cab232332 --sql-confirm-password Cab232332 --sql-skip-adding-user false`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

    // Validate Aad App
    await SqlValidator.init(context);
    await SqlValidator.validateSql();
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
