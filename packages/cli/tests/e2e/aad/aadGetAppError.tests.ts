// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Bowen Song <bowen.song@microsoft.com>
 */

import fs from "fs-extra";

import path from "path";

import { expect } from "chai";

import { describe, it } from "mocha";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  setSimpleAuthSkuNameToB1,
} from "../commonUtils";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";

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

    await execAsync(`teamsfx new --interactive false --app-name ${appName}`, {
      cwd: testFolder,

      env: process.env,

      timeout: 0,
    });

    console.log(`[Successfully] scaffold to ${projectPath}`);
  });

  it(`AAD: AadGetAppError`, async function () {
    {
      // set fake object id in context

      if (isMultiEnvEnabled()) {
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
      } else {
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

        context["fx-resource-aad-app-for-teams"]["objectId"] = "fake";

        context["fx-resource-simple-auth"]["skuName"] = "B1";

        await fs.writeJSON(`${projectPath}/.fx/env.default.json`, context, { spaces: 4 });
        try {
          await execAsync(`teamsfx provision --subscription ${subscription}`, {
            cwd: projectPath,

            env: process.env,

            timeout: 0,
          });
        } catch (error) {
          expect(error.toString()).to.contains("AadGetAppError");
        }
      }
    }
  });

  afterEach(async () => {
    // clean up
    if (isMultiEnvEnabled()) {
      await cleanUp(appName, projectPath, true, false, false, true);
    } else {
      await cleanUp(appName, projectPath, true, false, false);
    }
  });
});
