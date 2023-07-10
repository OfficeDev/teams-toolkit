// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { getTestFolder, getUniqueAppName } from "../commonUtils";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../utils/cleaner";
import { TemplateProject } from "../../commonlib/constants";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(
    `${TemplateProject.QueryOrg}`,
    { testPlanCaseId: 24132148, author: "v-ivanchen@microsoft.com" },
    async function () {
      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProject.QueryOrg
      );
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

      // Provision
      {
        const { success } = await Executor.provision(projectPath);
        expect(success).to.be.true;
      }

      // deploy
      {
        const { success } = await Executor.deploy(projectPath);
        expect(success).to.be.true;
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
