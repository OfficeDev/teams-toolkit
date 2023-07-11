// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import {
  getTestFolder,
  readContextMultiEnvV3,
  getUniqueAppName,
} from "../commonUtils";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../utils/cleaner";
import { BotValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { environmentManager } from "@microsoft/teamsfx-core";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(
    `${TemplateProject.NpmSearch}`,
    { testPlanCaseId: 15277471, author: "v-ivanchen@microsoft.com" },
    async function () {
      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProject.NpmSearch
      );
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

      // Provision
      {
        const { success } = await Executor.provision(projectPath);
        expect(success).to.be.true;
      }

      // Validate Provision
      const context = await readContextMultiEnvV3(projectPath, env);

      // Validate Bot Provision
      const bot = new BotValidator(context, projectPath, env);
      await bot.validateProvisionV3(false);

      // deploy
      {
        const { success } = await Executor.deploy(projectPath);
        expect(success).to.be.true;
      }

      // Validate deployment
      {
        // Get context
        const context = await readContextMultiEnvV3(projectPath, env);

        // Validate Bot Deploy
        const bot = new BotValidator(context, projectPath, env);
        await bot.validateDeploy();
      }

      // validate
      {
        const { success } = await Executor.validate(projectPath);
        expect(success).to.be.true;
      }

      // package
      {
        const { success } = await Executor.package(projectPath);
        expect(success).to.be.true;
      }
    }
  );

  after(async () => {
    await Cleaner.clean(projectPath);
  });
});
