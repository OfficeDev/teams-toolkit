// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowen.song@microsoft.com>
 */

import { environmentManager } from "@microsoft/teamsfx-core";
import fs from "fs-extra";
import { cloneDeep } from "lodash";
import path from "path";
import { teamsAppTenantIdConfigKey } from "../../../src/cmds/preview/constants";

import { AadValidator } from "../../commonlib";
import { it } from "../../commonlib/it";

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

    it(
      `Provision Resource: Update Domain and Endpoint for AAD`,
      { testPlanCaseId: 9576711 },
      async function () {
        const env = cloneDeep(process.env);
        // new a project
        await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
          cwd: testFolder,
          env: env,
          timeout: 0,
        });
        console.log(`[Successfully] scaffold to ${projectPath}`);
        await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());

        // provision
        await execAsyncWithRetry(`teamsfx provision --subscription ${subscription}`, {
          cwd: projectPath,
          env: env,
          timeout: 0,
        });

        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Aad App
        const aad = AadValidator.init(context);
        await AadValidator.validate(aad);
      }
    );

    after(async () => {
      // clean up
      await cleanUp(appName, projectPath, true, false, false);
    });
  });
}

test(true);
test(false);
