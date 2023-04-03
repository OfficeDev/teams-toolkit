// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuan Tian <tianyuan@microsoft.com>
 */

import { AppPackageFolderName, BuildFolderName } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import fs from "fs-extra";
import { describe } from "mocha";
import path from "path";

import { CliHelper } from "../../commonlib/cliHelper";
import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  mockTeamsfxMultiEnvFeatureFlag,
  setBotSkuNameToB1Bicep,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";

import { Capability } from "../../commonlib/constants";

import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Multi Env Happy Path for Azure", function () {
  const env = "e2e";
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const processEnv = mockTeamsfxMultiEnvFeatureFlag();

  it(`tab with mult env`, { testPlanCaseId: 15244879 }, async function () {
    if (isV3Enabled()) {
      return this.skip();
    }
    try {
      let result;
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

      await CliHelper.setSubscription(subscription, projectPath, processEnv);

      // add env
      await CliHelper.addEnv(env, projectPath, processEnv);

      // update SKU from free to B1 to prevent free SKU limit error
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await setBotSkuNameToB1Bicep(projectPath, env);
      console.log(`[Successfully] update simple auth sku to B1`);

      // list env
      result = await execAsync(`teamsfx env list`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });
      const envs = result.stdout.trim().split(/\r?\n/).sort();
      chai.expect(envs).to.deep.equal(["dev", "e2e"]);
      chai.expect(result.stderr).to.be.empty;
      console.log(
        `[Successfully] env list, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      // provision
      result = await execAsyncWithRetry(
        `teamsfx provision --sql-admin-name e2e --sql-password Cab232332${getUuid().substring(
          0,
          6
        )} --env ${env}`,
        {
          cwd: projectPath,
          env: processEnv,
          timeout: 0,
        }
      );
      console.log(
        `[Successfully] provision, stdout: '${result.stdout}', stderr: '${result.stderr}'`
      );

      // validate manifest
      result = await execAsyncWithRetry(`teamsfx validate --env ${env}`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        // Validate validate manifest
        chai.expect(result.stderr).to.be.empty;
      }

      // update manifest
      const updateManifestCmd = `teamsfx deploy manifest --env ${env} --include-app-manifest yes`;
      result = await execAsyncWithRetry(updateManifestCmd, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        // Validate update manifest
        chai.expect(result.stderr).to.be.empty;
      }

      // package
      await execAsyncWithRetry(`teamsfx package --env ${env}`, {
        cwd: projectPath,
        env: processEnv,
        timeout: 0,
      });

      {
        // Validate package
        const file = `${projectPath}/${BuildFolderName}/${AppPackageFolderName}/appPackage.${env}.zip`;
        chai.expect(await fs.pathExists(file)).to.be.true;
      }
    } catch (e) {
      console.log("Unexpected exception is thrown when running test: " + e);
      console.log(e.stack);
      throw e;
    }
  });

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, false, false, false, env);
  });
});
