// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Aocheng Wang <aochengwang@microsoft.com>
 */

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";

import {
  cleanUpLocalProject,
  execAsync,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  loadContext,
  mockTeamsfxMultiEnvFeatureFlag,
} from "../commonUtils";
import { AppPackageFolderName, BuildFolderName } from "@microsoft/teamsfx-api";
import { AppStudioValidator } from "../../commonlib";

describe("Multi Env Happy Path for SPFx", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const type = "none";
  const processEnv = mockTeamsfxMultiEnvFeatureFlag();
  const env = "e2e";

  it("Can create/provision/deploy/validate/package/publish an SPFx project", async function () {
    const command = `teamsfx new --interactive false --app-name ${appName} --capabilities tab-spfx --spfx-framework-type ${type} --spfx-webpart-name helloworld --programming-language typescript`;
    let result = await execAsync(command, {
      cwd: testFolder,
      env: processEnv,
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

    // add env
    result = await execAsync(`teamsfx env add ${env} --env dev`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });
    console.log(`[Successfully] env add, stdout: '${result.stdout}', stderr: '${result.stderr}'`);

    // list env
    result = await execAsync(`teamsfx env list`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });
    const envs = result.stdout.trim().split(/\r?\n/).sort();
    expect(envs).to.deep.equal(["dev", "e2e"]);
    expect(result.stderr).to.be.empty;
    console.log(`[Successfully] env list, stdout: '${result.stdout}', stderr: '${result.stderr}'`);

    // provision
    result = await execAsyncWithRetry(`teamsfx provision --env ${env}`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });
    console.log(`[Successfully] provision, stdout: '${result.stdout}', stderr: '${result.stderr}'`);

    {
      // Get context
      const contextResult = await loadContext(projectPath, env);
      if (contextResult.isErr()) {
        throw contextResult.error;
      }
      const context = contextResult.value;

      // Only check Teams App existence
      const appStudio = AppStudioValidator.init(context);
      AppStudioValidator.validateTeamsAppExist(appStudio);
    }

    // deploy
    await execAsyncWithRetry(`teamsfx deploy --env ${env}`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    {
      // Validate sharepoint package, see fx-core/src/plugins/resource/spfx/plugin.ts: SPFxPluginImpl.buildSPPackge()
      const solutionConfig = await fs.readJson(`${projectPath}/SPFx/config/package-solution.json`);
      const sharepointPackage = `${projectPath}/SPFx/sharepoint/${solutionConfig.paths.zippedPackage}`;
      expect(await fs.pathExists(sharepointPackage)).to.be.true;
    }

    // validate manifest
    result = await execAsyncWithRetry(`teamsfx validate --env ${env}`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    {
      // Validate validate manifest
      expect(result.stderr).to.be.empty;
    }

    // package
    await execAsyncWithRetry(`teamsfx package --env ${env}`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    {
      // Validate package
      const file = `${projectPath}/${BuildFolderName}/${AppPackageFolderName}/appPackage.${env}.zip`;
      expect(await fs.pathExists(file)).to.be.true;
    }

    // publish
    result = await execAsyncWithRetry(`teamsfx publish --env ${env}`, {
      cwd: projectPath,
      env: processEnv,
      timeout: 0,
    });

    {
      expect(result.stderr).to.be.empty;
    }
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
