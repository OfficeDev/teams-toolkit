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
import { FrontendValidator } from "../../commonlib";
import { TemplateProjectFolder } from "../../utils/constants";
import { Cleaner } from "../../commonlib/cleaner";
import { environmentManager } from "@microsoft/teamsfx-core";
import { Executor } from "../../utils/executor";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(
    `${TemplateProjectFolder.HelloWorldTabBackEnd}`,
    { testPlanCaseId: 15277459, author: "v-ivanchen@microsoft.com" },
    async function () {
      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProjectFolder.HelloWorldTabBackEnd
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

      // Validate Tab Frontend
      const frontend = FrontendValidator.init(context);
      await FrontendValidator.validateProvision(frontend);

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
