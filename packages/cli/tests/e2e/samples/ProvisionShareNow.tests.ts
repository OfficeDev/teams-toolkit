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
  validateTabAndBotProjectProvision,
  getUniqueAppName,
  editDotEnvFile,
} from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";
import { TemplateProject } from "../../commonlib/constants";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { Executor } from "../../utils/executor";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  before(async () => {
    await cleanUpResourceGroup("share_now");
  });

  it(`${TemplateProject.ShareNow}`, { testPlanCaseId: 15277467 }, async function () {
    // [BUG] CI enabled will force eslint warning to error. workaround: disable CI
    process.env["CI"] = "false";

    await Executor.openTemplateProject(appName, testFolder, TemplateProject.ShareNow);
    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    // Provision
    const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
    editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
    editDotEnvFile(envFilePath, "SQL_PASSWORD", "Cab232332" + getUuid().substring(0, 6));
    {
      const { success, stderr } = await Executor.provision(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Provision failed");
      }
    }

    // Validate Provision
    await validateTabAndBotProjectProvision(projectPath, env);

    // Deploy
    {
      const { success, stderr } = await Executor.deploy(projectPath);
      if (!success) {
        console.log(stderr);
        chai.assert.fail("Deploy failed");
      }
    }
  });

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false);
  });
});
