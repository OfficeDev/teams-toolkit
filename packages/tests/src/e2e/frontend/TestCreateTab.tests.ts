// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { environmentManager } from "@microsoft/teamsfx-core";
import { dotenvUtil } from "@microsoft/teamsfx-core/src/component/utils/envUtil";
import { assert } from "chai";
import fs from "fs-extra";
import { describe } from "mocha";
import path from "path";
import M365Login from "@microsoft/teamsfx-cli/src/commonlib/m365Login";
import { AadValidator, FrontendValidator } from "../../commonlib";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../utils/constants";
import { Cleaner } from "../../commonlib/cleaner";
import {
  createResourceGroup,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  removeTeamsAppExtendToM365,
} from "../commonUtils";

describe("Create single tab", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const envName = environmentManager.getDefaultEnvName();
  const resourceGroupName = `${appName}-rg`;

  after(async () => {
    // clean up
    await Cleaner.clean(projectPath);
  });
  describe("feature flags for API v3", async function () {
    it(
      `Create react app without Azure Function`,
      { testPlanCaseId: 24137586, author: "zhijie.huang@microsoft.com" },
      async () => {
        // new a project ( tab only )
        await CliHelper.createProjectWithCapability(
          appName,
          testFolder,
          Capability.M365SsoLaunchPage
        );
        {
          // Validate scaffold
          await FrontendValidator.validateScaffoldV3(projectPath, "javascript");
        }
      }
    );

    it(
      `Provision Resource: React app without function`,
      { testPlanCaseId: 24137596, author: "zhijie.huang@microsoft.com" },
      async () => {
        // remove teamsApp/extendToM365 in case it fails
        removeTeamsAppExtendToM365(path.join(projectPath, "teamsapp.yml"));

        const result = await createResourceGroup(resourceGroupName, "eastus");
        assert.isTrue(result);

        await CliHelper.provisionProject(projectPath, "", envName as "dev", {
          ...process.env,
          AZURE_RESOURCE_GROUP_NAME: resourceGroupName,
        });

        // Validate provision
        // Get context
        const envFilePath = path.join(projectPath, "env", `.env.${envName}`);
        assert.isTrue(fs.pathExistsSync(envFilePath));
        const parseResult = dotenvUtil.deserialize(
          await fs.readFile(envFilePath, { encoding: "utf8" })
        );
        const context = parseResult.obj;
        assert.isNotEmpty(context);

        // Validate Aad App
        const aad = AadValidator.init(context, false, M365Login);
        await AadValidator.validate(aad);

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateProvision(frontend);
      }
    );

    it(
      `Deploy react app without Azure Function and SQL`,
      { testPlanCaseId: 24137600, author: "zhijie.huang@microsoft.com" },
      async () => {
        // deploy
        await execAsyncWithRetry(`teamsfx deploy`, {
          cwd: projectPath,
          env: process.env,
          timeout: 0,
        });

        // Validate deployment
        const envFilePath = path.join(projectPath, "env", `.env.${envName}`);
        assert.isTrue(fs.pathExistsSync(envFilePath));
        const parseResult = dotenvUtil.deserialize(
          await fs.readFile(envFilePath, { encoding: "utf8" })
        );
        const context = parseResult.obj;

        // Validate Tab Frontend
        const frontend = FrontendValidator.init(context);
        await FrontendValidator.validateDeploy(frontend);
      }
    );
  });
});
