// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { cleanUpLocalProject, execAsync, getTestFolder } from "../commonUtils";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const sampleName = "todo-list-with-Azure-backend";
  const projectPath = path.resolve(testFolder, sampleName);

  it(
    `${sampleName}`,
    { testPlanCaseId: 24137474, author: "zhiyou@microsoft.com" },
    async function () {
      await execAsync(`teamsfx new template ${sampleName}`, {
        cwd: testFolder,
        env: process.env,
        timeout: 0,
      });

      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(fs.pathExistsSync(path.resolve(projectPath, "teamsapp.yml"))).to.be
        .true;
    }
  );

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
