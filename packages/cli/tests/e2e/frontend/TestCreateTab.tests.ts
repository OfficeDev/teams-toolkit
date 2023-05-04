// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { environmentManager, isV3Enabled } from "@microsoft/teamsfx-core";
import { dotenvUtil } from "@microsoft/teamsfx-core/src/component/utils/envUtil";
import { expect } from "chai";
import fs from "fs-extra";
import { describe } from "mocha";
import path from "path";
import M365Login from "../../../src/commonlib/m365Login";
import { AadValidator, FrontendValidator } from "../../commonlib";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { Cleaner } from "../../utils/cleaner";
import {
  execAsyncWithRetry,
  getSubscriptionId,
  getTestFolder,
  getUniqueAppName,
} from "../commonUtils";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    // clean up
    await Cleaner.clean(projectPath);
  });
  describe("feature flags for API v3", async function () {
    it(`Create react app without Azure Function`, { testPlanCaseId: 9426074 }, async () => {
      // new a project ( tab only )
      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
      {
        // Validate scaffold
        if (isV3Enabled()) {
          await FrontendValidator.validateScaffoldV3(projectPath, "javascript");
        } else {
          await FrontendValidator.validateScaffold(projectPath, "javascript");
        }
      }
    });

    it(`Provision Resource: React app without function`, { testPlanCaseId: 10298738 }, async () => {
      await CliHelper.setSubscription(subscription, projectPath);

      await CliHelper.provisionProject(projectPath);

      // Validate provision
      // Get context
      let context: any = null;
      if (isV3Enabled()) {
        const envFilePath = path.join(projectPath, "env", `.env.${env}`);
        expect(fs.pathExistsSync(envFilePath)).to.be.true;
        const parseResult = dotenvUtil.deserialize(
          await fs.readFile(envFilePath, { encoding: "utf8" })
        );
        context = parseResult.obj;
        expect(context).to.be.not.null;
      } else {
        context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);
      }

      // Validate Aad App
      const aad = AadValidator.init(context, false, M365Login);
      await AadValidator.validate(aad);

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);
    });

    it(`Deploy react app without Azure Function and SQL`, { testPlanCaseId: 9454296 }, async () => {
      // deploy
      await execAsyncWithRetry(`teamsfx deploy`, {
        cwd: projectPath,
        env: process.env,
        timeout: 0,
      });

      // Validate deployment
      let context: any = null;
      if (isV3Enabled()) {
        const envFilePath = path.join(projectPath, "env", `.env.${env}`);
        expect(fs.pathExistsSync(envFilePath)).to.be.true;
        const parseResult = dotenvUtil.deserialize(
          await fs.readFile(envFilePath, { encoding: "utf8" })
        );
        context = parseResult.obj;
      } else {
        context = await fs.readJSON(`${projectPath}/.fx/states/state.dev.json`);
      }

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateDeploy(frontend);
    });
  });
});
