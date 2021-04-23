// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import * as constants from "../../../src/constants";
import { execAsync, getTestFolder, getUniqueAppName } from "../commonUtils";

describe("Start a new project", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const type = "react";

  it("Create SPFx project with React framework - Test Plan ID 9426243", async function () {
    const command = `${constants.cliName} new --app-name ${appName} --folder ${testFolder} --host-type spfx --spfx-framework-type ${type} --spfx-webpart-name helloworld --interactive false`;
    const result = await execAsync(
      command,
      {
        cwd: process.cwd(),
        env: process.env,
        timeout: 0
      }
    );

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
      "src/webparts/helloworld/components/Helloworld.tsx",
      "src/webparts/helloworld/components/IHelloworldProps.ts",
      "src/webparts/helloworld/components/Helloworld.module.scss",
      "src/webparts/helloworld/loc/en-us.js",
      "src/webparts/helloworld/loc/mystrings.d.ts",
      "src/index.ts",
      ".editorconfig",
      ".gitignore",
      "gulpfile.js",
      "package.json",
      "README.md",
      "tsconfig.json",
      "tslint.json"
    ];
    for (const file of files) {
      const filePath = path.join(testFolder, appName, `SPFx`, file);
      expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
    }

    expect(result.stderr).to.eq("");
  });

  this.afterAll(() => {
    fs.removeSync(path.resolve(testFolder, appName));
  });
});
