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
import { TemplateProject } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../utils/cleaner";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(
    `${TemplateProject.TodoListSpfx}`,
    { testPlanCaseId: 15277466, author: "v-ivanchen@microsoft.com" },
    async function () {
      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProject.TodoListSpfx
      );
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "src", "src"))).to.be
        .true;

      // validate
      await Executor.validate(projectPath);

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
    }
  );

  afterEach(async () => {
    await Cleaner.clean(projectPath);
  });
});
