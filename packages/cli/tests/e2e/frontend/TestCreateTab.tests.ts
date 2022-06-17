// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { it } from "../../commonlib/it";
import { describe } from "mocha";
import fs from "fs-extra";
import path from "path";
import { AadValidator, FrontendValidator } from "../../commonlib";
import { environmentManager } from "@microsoft/teamsfx-core";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
} from "../commonUtils";
import M365Login from "../../../src/commonlib/m365Login";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import mockedEnv, { RestoreFn } from "mocked-env";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, true, false, false);
  });
  describe("feature flags for API v3", async function () {
    // TODO: fix api v3
    // const envs = [{ TEAMSFX_APIV3: "false" }, { TEAMSFX_APIV3: "true" }];
    const envs = [{ TEAMSFX_APIV3: "false" }];
    let mockedEnvRestore: RestoreFn;
    for (const envParam of envs) {
      beforeEach(() => {
        mockedEnvRestore = mockedEnv(envParam);
      });
      afterEach(() => {
        mockedEnvRestore();
      });
      it(
        `Create react app without Azure Function, API V3: ${envParam.TEAMSFX_APIV3}`,
        { testPlanCaseId: 9426074 },
        async () => {
          // new a project ( tab only )
          await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
          {
            // Validate scaffold
            await FrontendValidator.validateScaffold(projectPath, "javascript");
          }
        }
      );

      it(
        `Provision Resource: React app without function, API V3: ${envParam.TEAMSFX_APIV3}`,
        { testPlanCaseId: 10298738 },
        async () => {
          await setSimpleAuthSkuNameToB1Bicep(projectPath, env);

          await CliHelper.setSubscription(subscription, projectPath);

          await CliHelper.provisionProject(projectPath);

          // Validate provision
          // Get context
          const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

          // Validate Aad App
          const aad = AadValidator.init(context, false, M365Login);
          await AadValidator.validate(aad);

          // Validate Tab Frontend
          const frontend = FrontendValidator.init(context, true);
          await FrontendValidator.validateProvision(frontend);
        }
      );

      it(
        `Deploy react app without Azure Function and SQL, API V3: ${envParam.TEAMSFX_APIV3}`,
        { testPlanCaseId: 9454296 },
        async () => {
          // deploy
          await execAsyncWithRetry(`teamsfx deploy`, {
            cwd: projectPath,
            env: process.env,
            timeout: 0,
          });

          // Validate deployment
          const context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);

          // Validate Tab Frontend
          const frontend = FrontendValidator.init(context, true);
          await FrontendValidator.validateDeploy(frontend);
        }
      );
    }
  });
});
