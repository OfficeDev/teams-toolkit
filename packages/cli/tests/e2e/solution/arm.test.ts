// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Di Lin <dilin@microsoft.com>
 */

import path from "path";
import { AadValidator, BotValidator } from "../../commonlib";
import { environmentManager, isFeatureFlagEnabled } from "@microsoft/teamsfx-core";
import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setBotSkuNameToB1Bicep,
  readContextMultiEnv,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { FeatureFlagName } from "@microsoft/teamsfx-core/src/common/constants";
import "mocha";

describe("Add Capabilities", function () {
  //  Only test when insider feature flag enabled
  if (!isFeatureFlagEnabled(FeatureFlagName.InsiderPreview, true)) {
    return;
  }

  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  before(async () => {
    // new a tab project
    await execAsync(`teamsfx new --interactive false --app-name ${appName} --capabilities tab `, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] scaffold to ${projectPath}`);
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false, true);
  });

  it("tab project can add bot capability and provision", async () => {
    // Add bot capability
    await execAsync(`teamsfx capability add bot `, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] add capability bot to ${projectPath}`);

    await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

    // set subscription
    await execAsync(`teamsfx account set --subscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] set subscription for ${projectPath}`);

    // provision
    await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] provision for ${projectPath}`);

    {
      // Validate provision
      // Get context
      const context = await readContextMultiEnv(
        projectPath,
        environmentManager.getDefaultEnvName()
      );

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Bot Provision
      const bot = BotValidator.init(context, true);
      await BotValidator.validateProvision(bot, true);
    }
  });
});
