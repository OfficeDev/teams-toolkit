// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { cleanUpResourceGroup } from "../clean";
import {
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  validateTabAndBotProjectProvision,
  getUniqueAppName,
  editDotEnvFile,
} from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  before(async () => {
    await cleanUpResourceGroup("share_now");
  });

  it(`${TemplateProject.ShareNow}`, { testPlanCaseId: 15277467 }, async function () {
    if (isV3Enabled()) {
      await CliHelper.openTemplateProject(appName, testFolder, TemplateProject.ShareNow);
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
    } else {
      await CliHelper.createTemplateProject(appName, testFolder, TemplateProject.ShareNow);
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;
    }

    // Provision
    if (isV3Enabled()) {
      const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
      editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
      editDotEnvFile(envFilePath, "SQL_PASSWORD", "Cab232332" + getUuid().substring(0, 6));
      await CliHelper.provisionProject(projectPath);
    } else {
      await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
      await CliHelper.setSubscription(subscription, projectPath);
      await CliHelper.provisionProject(
        projectPath,
        `--sql-admin-name Abc123321 --sql-password Cab232332${getUuid().substring(0, 6)}`
      );
    }

    // Validate Provision
    await validateTabAndBotProjectProvision(projectPath, env);

    // Deploy
    await CliHelper.deployAll(projectPath);
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });
});
