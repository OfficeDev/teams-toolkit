// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import { environmentManager } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import path from "path";
import { describe } from "mocha";
import { SqlValidator } from "../../commonlib";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { getUuid } from "../../commonlib/utilities";
import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  setSkipAddingSqlUserToConfig,
} from "../commonUtils";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Provision to Azure with SQL", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`Provision SQL with skip adding user`, { testPlanCaseId: 12730645 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    // new a project ( tab + function + sql )
    await CliHelper.createProjectWithCapability(
      appName,
      testFolder,
      Capability.Tab,
      process.env,
      "--azure-resources function sql"
    );

    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await setSkipAddingSqlUserToConfig(projectPath, env);

    // provision
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(
      projectPath,
      `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`
    );

    // Get context
    const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

    // Validate Aad App
    await SqlValidator.init(context);
    await SqlValidator.validateSql(0);
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });
});
