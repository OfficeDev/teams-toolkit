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
  validateTabAndBotProjectProvision,
  getUniqueAppName,
  editDotEnvFile,
} from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";
import { TemplateProject } from "../../commonlib/constants";
import { environmentManager } from "@microsoft/teamsfx-core";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../utils/cleaner";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  before(async () => {
    await cleanUpResourceGroup("share_now");
  });

  it(
    `${TemplateProject.ShareNow}`,
    { testPlanCaseId: 15277467, author: "v-ivanchen@microsoft.com" },
    async function () {
      // disable CI
      process.env["CI"] = "false";

      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProject.ShareNow
      );
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

      // Provision
      const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
      editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
      editDotEnvFile(
        envFilePath,
        "SQL_PASSWORD",
        "Cab232332" + getUuid().substring(0, 6)
      );
      // Provision
      {
        const { success } = await Executor.provision(projectPath);
        expect(success).to.be.true;
      }

      // Validate Provision
      await validateTabAndBotProjectProvision(projectPath, env);

      // deploy
      {
        const { success } = await Executor.deploy(projectPath);
        expect(success).to.be.true;
      }
    }
  );

  after(async () => {
    await Cleaner.clean(projectPath);
  });
});
