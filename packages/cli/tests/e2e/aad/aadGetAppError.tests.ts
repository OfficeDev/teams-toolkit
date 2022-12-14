// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowen.song@microsoft.com>
 */

import fs from "fs-extra";

import path from "path";

import { expect } from "chai";

import { describe } from "mocha";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  setSimpleAuthSkuNameToB1,
} from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { it } from "@microsoft/extra-shot-mocha";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("aadGetAppError", function () {
  let testFolder: string;

  let appName: string;

  let subscription: string;

  let projectPath: string;

  this.retries(3);

  beforeEach(async () => {
    testFolder = getTestFolder();

    appName = getUniqueAppName();

    subscription = getSubscriptionId();

    projectPath = path.resolve(testFolder, appName);

    // new a project
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    console.log(`[Successfully] scaffold to ${projectPath}`);
  });

  it(`AAD: AadGetAppError`, { testPlanCaseId: 10988682 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    {
      // set fake object id in context
      const state = {
        "fx-resource-aad-app-for-teams": {
          objectId: "fake",
        },
        solution: {
          remoteTeamsAppId: "fake",
        },
      };
      const folderPath = `${projectPath}/.fx/states`;
      await fs.mkdir(folderPath);
      const filePath = environmentManager.getEnvStateFilesPath(
        environmentManager.getDefaultEnvName(),
        projectPath
      ).envState;
      await fs.writeJSON(filePath, state, { spaces: 4 });

      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
      try {
        const { stdout, stderr } = await execAsync(
          `teamsfx provision --subscription ${subscription}`,
          {
            cwd: projectPath,
            env: process.env,
            timeout: 0,
          }
        );
      } catch (error) {
        expect(error.toString()).to.contains("Failed to get AAD app with Object Id");
      }
    }
  });

  afterEach(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
});
