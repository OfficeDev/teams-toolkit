// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";

import { AadValidator, FrontendValidator, FunctionValidator, SimpleAuthValidator } from "@microsoft/teamsfx-api";

import {
  execAsync,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  setBotSkuNameToB1,
  cleanUp,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";

describe("Azure App Happy Path", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Tab + Bot (Create New) + Function + SQL + Apim`, async function () {
    // new a project ( tab + function + sql )
    await execAsync(
      `teamsfx new --interactive false --app-name ${appName} --capabilities tab --azure-resources function sql`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await setSimpleAuthSkuNameToB1(projectPath);

    // capability add bot
    await execAsync(
      `teamsfx capability add bot`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    await setBotSkuNameToB1(projectPath);

    // set subscription
    await execAsync(
      `teamsfx account set --subscription ${subscription}`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    // resource add apim
    await execAsync(
      `teamsfx resource add azure-apim --function-name testApim`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      /// TODO: add check for scaffold
    }

    // provision
    await execAsync(
      `teamsfx provision --sql-admin-name Abc123321 --sql-password Cab232332 --sql-confirm-password Cab232332`
      + ` --sql-skip-adding-user false`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      // Validate provision
      // Get context
      const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);

      // Validate Aad App
      const aad = AadValidator.init(context, false, AppStudioLogin);
      await AadValidator.validate(aad);

      // Validate Simple Auth
      const simpleAuth = SimpleAuthValidator.init(context);
      await SimpleAuthValidator.validate(simpleAuth, aad);

      // Validate Function App
      const func = FunctionValidator.init(context);
      await FunctionValidator.validateProvision(func);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);
    }

    // // deploy
    // await execAsync(
    //   `teamsfx deploy --open-api-document openapi/openapi.json --api-prefix qwed --api-version 1`,
    //   {
    //     cwd: projectPath,
    //     env: process.env,
    //     timeout: 0
    //   }
    // );

    {
      /// TODO: add check for deploy
    }

    // validate the manifest
    await execAsync(
      `teamsfx validate`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      /// TODO: add check for validate
    }

    // build
    await execAsync(
      `teamsfx build`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0
      }
    );

    {
      /// TODO: add check for build
    }

    /// TODO: Publish broken: https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/9856390
    // // publish
    // await execAsync(
    //   `teamsfx publish`,
    //   {
    //     cwd: projectPath,
    //     env: process.env,
    //     timeout: 0
    //   }
    // );

    // {
    //   /// TODO: add check for publish
    // }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, true, true);
  });
});
