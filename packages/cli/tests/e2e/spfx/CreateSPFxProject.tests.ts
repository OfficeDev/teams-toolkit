// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ning Liu <nliu@microsoft.com>
 */

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import {
  cleanUpLocalProject,
  cleanupSharePointPackage,
  execAsync,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  readContext,
  readContextMultiEnv,
} from "../commonUtils";
import { AppStudioValidator, SharepointValidator } from "../../commonlib";
import { environmentManager, isMultiEnvEnabled } from "@microsoft/teamsfx-core";

describe("Start a new project", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  let appId: string;

  it("Create, provision and run SPFx project with React framework", async function () {
    let command = `teamsfx new --interactive false --app-name ${appName} --capabilities tab-spfx --spfx-framework-type react --spfx-webpart-name helloworld --programming-language typescript`;
    let result = await execAsync(command, {
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
      "src/webparts/helloworld/components/Helloworld.module.scss",
      "src/webparts/helloworld/components/Helloworld.tsx",
      "src/webparts/helloworld/components/IHelloworldProps.ts",
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

    // validation succeed without provision
    command = "teamsfx validate";
    result = await execAsync(command, {
      cwd: path.join(testFolder, appName),
      env: process.env,
      timeout: 0,
    });
    expect(result.stderr).to.eq("");

    // provision
    result = await execAsyncWithRetry(`teamsfx provision`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] provision, stdout: '${result.stdout}', stderr: '${result.stderr}'`);
    expect(result.stderr).to.eq("");

    {
      if (isMultiEnvEnabled()) {
        // Get context
        const context = await readContextMultiEnv(
          projectPath,
          environmentManager.getDefaultEnvName()
        );

        // Only check Teams App existence
        const appStudio = AppStudioValidator.init(context);
        AppStudioValidator.validateTeamsAppExist(appStudio);
      } else {
        // Get context
        const context = await readContext(projectPath);

        // Only check Teams App existence
        const appStudio = AppStudioValidator.init(context);
        AppStudioValidator.validateTeamsAppExist(appStudio);
      }
    }

    // deploy
    result = await execAsyncWithRetry(`teamsfx deploy`, {
      cwd: projectPath,
      env: process.env,
      timeout: 0,
    });
    console.log(`[Successfully] deploy, stdout: '${result.stdout}', stderr: '${result.stderr}'`);
    expect(result.stderr).to.eq("");

    {
      // Validate sharepoint package
      const solutionConfig = await fs.readJson(`${projectPath}/SPFx/config/package-solution.json`);
      const sharepointPackage = `${projectPath}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
      appId = solutionConfig["solution"]["id"];
      expect(appId).to.not.be.empty;
      expect(await fs.pathExists(sharepointPackage)).to.be.true;

      // Check if package exsist in App Catalog
      SharepointValidator.init();
      SharepointValidator.validateDeploy(appId);
    }
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
    await cleanupSharePointPackage(appId);
  });
});
