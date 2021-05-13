// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";

import { cleanUpLocalProject, execAsync, getTestFolder, getUniqueAppName } from "../commonUtils";

describe("Start a new project", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const type = "none";

  it("Create SPFx project without framework - Test Plan ID 9426251", async function () {
    const command = `teamsfx new --interactive false --app-name ${appName} --host-type spfx --spfx-framework-type ${type} --spfx-webpart-name helloworld --programming-language typescript`;
    const result = await execAsync(command, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    // check specified files
    const files: string[] = [
      "config/config.json",
      "config/copy-assets.json",
      "config/deploy-azure-storage.json",
      "config/package-solution.json",
      "config/serve.json",
      "config/write-manifests.json",
      "src/webparts/helloworld/HelloworldWebPart.manifest.json",
      "src/webparts/helloworld/HelloworldWebPart.ts",
      "src/webparts/helloworld/loc/en-us.js",
      "src/webparts/helloworld/loc/mystrings.d.ts",
      "src/index.ts",
      ".gitignore",
      "gulpfile.js",
      "package.json",
      "README.md",
      "tsconfig.json",
      "tslint.json",
    ];
    for (const file of files) {
      const filePath = path.join(testFolder, appName, `SPFx`, file);
      expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
    }

    expect(result.stderr).to.eq("");
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
