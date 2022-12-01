// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import { environmentManager } from "@microsoft/teamsfx-core";
import { describe } from "mocha";
import fs from "fs-extra";
import path from "path";

import { SqlValidator } from "../../commonlib";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { getUuid } from "../../commonlib/utilities";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";

describe("Provision to Azure with SQL", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(
    `Provision react app with Azure Function and SQL`,
    { testPlanCaseId: 12700953 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }
      // new a project ( tab + function + sql )
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
      await CliHelper.addResourceToProject(projectPath, Resource.AzureSql);
      await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);

      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

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
      await SqlValidator.validateSql();
    }
  );

  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });
});
