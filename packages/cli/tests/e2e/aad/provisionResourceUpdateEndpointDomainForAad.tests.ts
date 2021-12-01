// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowen.song@microsoft.com>
 */

import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import path from "path";
import { teamsAppTenantIdConfigKey } from "../../../src/cmds/preview/constants";

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

function test(vsCallingCli: boolean) {
  describe("Provision", function () {
    const testFolder = getTestFolder();
    const appName = getUniqueAppName();
    const subscription = getSubscriptionId();
    const projectPath = path.resolve(testFolder, appName);

    it(`Provision Resource: Update Domain and Endpoint for AAD - Test Plan Id 9576711`, async function () {
      const env = cloneDeep(process.env);
      if (!isMultiEnvEnabled()) {
        if (vsCallingCli) {
          env["VS_CALLING_CLI"] = "true";
        }
      }
      // new a project
      await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
        cwd: testFolder,
        env: env,
        timeout: 0,
      });
      console.log(`[Successfully] scaffold to ${projectPath}`);

      {
        if (isMultiEnvEnabled()) {
          setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
        } else {
          // set fx-resource-simple-auth.skuName as B1
          const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
          if (!vsCallingCli) {
            // On VS calling CLI, simple auth plugin is not activated.
            context["fx-resource-simple-auth"]["skuName"] = "B1";
          }
          context["fx-resource-aad-app-for-teams"]["endpoint"] = "https://dormainfortest.test";
          context["fx-resource-aad-app-for-teams"]["domain"] = "dormainfortest.test";
          await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
        }
      }

      // provision
      await execAsyncWithRetry(`teamsfx provision --subscription ${subscription}`, {
        cwd: projectPath,
        env: env,
        timeout: 0,
      });

      if (isMultiEnvEnabled()) {
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Aad App
        const aad = AadValidator.init(context);
        await AadValidator.validate(aad);
      } else {
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

        // Validate Aad App
        const aad = AadValidator.init(context);
        await AadValidator.validate(aad);
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
}

test(true);
test(false);
