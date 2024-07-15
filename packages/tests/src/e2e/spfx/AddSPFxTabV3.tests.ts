// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huihui Wu <huihuiwu@microsoft.com>
 */

import * as fs from "fs-extra";
import * as path from "path";
import { expect, assert } from "chai";
import {
  cleanUpLocalProject,
  cleanupSharePointPackage,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
} from "../commonUtils";
import { AppStudioValidator, SharepointValidator } from "../../commonlib";
import { it } from "@microsoft/extra-shot-mocha";
import { AppPackageFolderName } from "@microsoft/teamsfx-api";
import {
  environmentNameManager,
  ProgrammingLanguage,
} from "@microsoft/teamsfx-core";
import { Capability } from "../../utils/constants";
import { Executor } from "../../utils/executor";

describe("Start a new project", function () {
  let appId: string;
  let appName: string;
  let testFolder: string;
  let projectPath: string;
  let teamsAppId: string | undefined;
  beforeEach(async () => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  it(
    "Add SPFx tab to existing project, provision and run SPFx project with React framework",
    { testPlanCaseId: 24137833, author: "huihuiwu@microsoft.com" },
    async function () {
      {
        const result = await Executor.createProject(
          testFolder,
          appName,
          Capability.Spfx,
          ProgrammingLanguage.TS
        );
        expect(result.success).to.be.true;
      }

      const spfxFolder = path.join(projectPath, "src");
      const manifestPath = path.join(
        projectPath,
        AppPackageFolderName,
        "manifest.json"
      );
      const localManifestPath = path.join(
        projectPath,
        AppPackageFolderName,
        "manifest.local.json"
      );
      {
        const result = await Executor.addSPFxWebPart(
          projectPath,
          spfxFolder,
          "secondwebpart",
          manifestPath,
          localManifestPath
        );
        expect(result.success).to.be.true;
        const config = await fs.readJson(
          `${projectPath}/src/config/config.json`
        );
        expect(config["bundles"]["helloworld-web-part"]).exist;
        expect(config["bundles"]["secondwebpart-web-part"]).exist;

        const manifest = await fs.readJson(manifestPath);
        expect(manifest.staticTabs.length).to.equal(2);
        const localManifest = await fs.readJson(localManifestPath);
        expect(localManifest.staticTabs.length).to.equal(2);
      }

      {
        // validation succeed without provision
        const result = await Executor.validate(
          projectPath,
          environmentNameManager.getDefaultEnvName()
        );
        expect(result.success).to.be.true;
      }

      {
        // validation local env succeed without local debug
        const result = await Executor.validate(
          projectPath,
          environmentNameManager.getLocalEnvName()
        );
        expect(result.success).to.be.true;
      }

      {
        // provision
        const result = await Executor.provision(
          projectPath,
          environmentNameManager.getDefaultEnvName()
        );
        expect(result.success).to.be.true;
      }

      {
        // Get context
        const context = await readContextMultiEnvV3(
          projectPath,
          environmentNameManager.getDefaultEnvName()
        );

        assert.exists(context.TEAMS_APP_ID);
        teamsAppId = context.TEAMS_APP_ID;
        AppStudioValidator.setE2ETestProvider();
      }

      {
        // deploy
        const result = await Executor.deploy(
          projectPath,
          environmentNameManager.getDefaultEnvName()
        );
        expect(result.success).to.be.true;
      }

      {
        // Validate sharepoint package
        const solutionConfig = await fs.readJson(
          `${projectPath}/src/config/package-solution.json`
        );
        const sharepointPackage = `${projectPath}/src/sharepoint/${solutionConfig.paths.zippedPackage}`;
        appId = solutionConfig["solution"]["id"];
        expect(appId).to.not.be.empty;
        expect(await fs.pathExists(sharepointPackage)).to.be.true;

        // Check if package exsist in App Catalog
        SharepointValidator.init();
        SharepointValidator.validateDeploy(appId);
      }

      {
        // preview
        const result = await Executor.preview(
          projectPath,
          environmentNameManager.getDefaultEnvName()
        );
        expect(result.success).to.be.true;
      }
    }
  );

  afterEach(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
    await cleanupSharePointPackage(appId);
  });
});
