// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import * as path from "path";
import "mocha";
import {
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  readContextMultiEnv,
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";
import { BotValidator } from "../../commonlib";
import { getUuid } from "../../commonlib/utilities";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Configuration successfully changed when with different plugins", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    await cleanUp(appName, projectPath, false, true, false);
  });

  it(`bot + sql`, { testPlanCaseId: 15685605 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureSql);

    // Provision
    await setBotSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(
      projectPath,
      `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`
    );

    // Assert
    {
      const context = await readContextMultiEnv(projectPath, env);

      // Validate Function App
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateProvision(false);
    }
  });
});
