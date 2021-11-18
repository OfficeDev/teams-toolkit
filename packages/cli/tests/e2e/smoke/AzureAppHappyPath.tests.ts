// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import path from "path";
import * as chai from "chai";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";
import {
  AadValidator,
  AppStudioValidator,
  FrontendValidator,
  FunctionValidator,
  SimpleAuthValidator,
} from "../../commonlib";

import {
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  setSimpleAuthSkuNameToB1,
  setBotSkuNameToB1,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  setBotSkuNameToB1Bicep,
} from "../commonUtils";
import AppStudioLogin from "../../../src/commonlib/appStudioLogin";
import { AppPackageFolderName } from "@microsoft/teamsfx-api";

describe("Azure App Happy Path", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);

  it(`Tab + Bot (Create New) + Function + SQL + Apim`, async function () {
    // new a project ( tab + function + sql )
    await execAsync(
      `teamsfx new --inTERactive false --app-name ${appName} --capabiLIties Tab --azure-resourcES fuNCtion sql`,
      {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      }
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    if (isMultiEnvEnabled()) {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setSimpleAuthSkuNameToB1(projectPath);
    }

    // capability add bot
    await execAsync(`teamsfx capability add bot`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    if (isMultiEnvEnabled()) {
      await setBotSkuNameToB1Bicep(projectPath, environmentManager.getDefaultEnvName());
    } else {
      await setBotSkuNameToB1(projectPath);
    }

    // set subscription
    await execAsync(`teamsfx account set --SUBscription ${subscription}`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    // resource add apim
    await execAsync(`teamsfx resource add azure-apim --function-NAme testApim`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      /// TODO: add check for scaffold
    }

    // provision
    await execAsyncWithRetry(
      `teamsfx provision --sql-admin-name Abc123321 --sql-password Cab232332`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      }
    );

    {
      if (isMultiEnvEnabled()) {
        // Validate provision
        // Get context
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

        // Validate Aad App
        const aad = AadValidator.init(context, false, AppStudioLogin);
        await AadValidator.validate(aad);

        // Validate Simple Auth
        const simpleAuth = SimpleAuthValidator.init(context);
        await SimpleAuthValidator.validate(simpleAuth, aad, "B1", true);

        // Validate Function App
        const func = FunctionValidator.init(context, true);
        await FunctionValidator.validateProvision(func, true, true);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context, true);
        await FrontendValidator.validateProvision(frontend);
      } else {
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
    }

    // deploy
    await execAsyncWithRetry(
      `teamsfx deploy --OPen-api-document openapi/openapi.json --api-prefix qwed --api-version v1`,
      {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      },
      3,
      `teamsfx deploy --open-api-document openapi/openapi.json --api-version v1`
    );

    {
      /// TODO: add check for deploy
    }

    // validate the manifest
    const validationResult = await execAsyncWithRetry(`teamsfx validate`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      chai.assert.isEmpty(validationResult.stderr);
    }

    // package
    await execAsyncWithRetry(`teamsfx package`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      if (isMultiEnvEnabled()) {
        // Validate built package
        const file = `${projectPath}/build/${AppPackageFolderName}/appPackage.dev.zip`;
        chai.assert.isTrue(await fs.pathExists(file));
      } else {
        // Validate built package
        const file = `${projectPath}/${AppPackageFolderName}/appPackage.zip`;
        chai.assert.isTrue(await fs.pathExists(file));
      }
    }

    // publish
    await execAsyncWithRetry(`teamsfx publish`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });

    {
      if (isMultiEnvEnabled()) {
        // Validate publish result
        const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);
        const aad = AadValidator.init(context, false, AppStudioLogin);
        const appId = aad.clientId;

        AppStudioValidator.init(context);
        await AppStudioValidator.validatePublish(appId);
      } else {
        // Validate publish result
        const context = await fs.readJSON(`${projectPath}/.fx/env.default.json`);
        const aad = AadValidator.init(context, false, AppStudioLogin);
        const appId = aad.clientId;

        AppStudioValidator.init(context);
        await AppStudioValidator.validatePublish(appId);
      }
    }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, true, true);
  });
});
