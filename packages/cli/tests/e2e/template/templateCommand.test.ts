// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";

import { execAsync, getTestFolder, cleanUpLocalProject } from "../commonUtils";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const sampleName = "todo-list-with-Azure-backend";
  const projectPath = path.resolve(testFolder, sampleName);

  it(`${sampleName}`, async function () {
    await execAsync(`teamsfx new template ${sampleName}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
