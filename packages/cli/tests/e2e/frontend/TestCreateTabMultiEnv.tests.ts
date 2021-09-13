// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, FrontendValidator, SimpleAuthValidator } from "../../commonlib";

import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  mockTeamsfxMultiEnvFeatureFlag,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const processEnv = mockTeamsfxMultiEnvFeatureFlag();

  it(`Tab`, async function () {
    // new a project (tab only)
    try {
      let result;
      result = await execAsync(
        `teamsfx new --interactive false --app-name ${appName} --capabilities tab `,
        {
          cwd: testFolder,
          env: processEnv,
          timeout: 0,
        }
      );
      console.log(
        `[Successfully] scaffold to ${projectPath}, stdout: '${result.stdout}', stderr: '${result.stderr}''`
      );
      await setSimpleAuthSkuNameToB1Bicep(projectPath);

      // set subscription
      result = await execAsync(`teamsfx account set --subscription ${subscription}`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      console.log(`[Successfully] set sub, stdout: '${result.stdout}', stderr: '${result.stderr}'`);

      // provision
      result = await execAsyncWithRetry(`teamsfx provision --env dev`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      console.log(
        `[Successfully] provision, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      {
        // Validate provision
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/publishProfiles/profile.dev.json`);

        // Validate Aad App
        const aad = AadValidator.init(context, false, AppStudioLogin);
        await AadValidator.validate(aad);

        // Validate Simple Auth
        const simpleAuth = SimpleAuthValidator.init(context);
        await SimpleAuthValidator.validate(simpleAuth, aad, "B1", true);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateProvision(frontend);
      }

      // deploy
      await execAsyncWithRetry(`teamsfx deploy --env dev`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        // Validate provision
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/publishProfiles/profile.dev.json`);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateDeploy(frontend);
      }
    } catch (e) {
      console.log("Unexpected exception is thrown when running test: " + e);
      throw e;
    }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false, true);
  });
});
