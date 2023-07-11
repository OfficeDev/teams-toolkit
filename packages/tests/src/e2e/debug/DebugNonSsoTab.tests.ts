// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */

import * as chai from "chai";
import * as fs from "fs-extra";
import { describe } from "mocha";
import * as path from "path";

import { it } from "@microsoft/extra-shot-mocha";

import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../utils/constants";
import {
  cleanUpLocalProject,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
} from "../commonUtils";
import { deleteTeamsApp, getTeamsApp } from "./utility";
import { removeTeamsAppExtendToM365 } from "../commonUtils";

describe("Debug V3 tab-non-sso template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    // clean up
    const context = await readContextMultiEnvV3(projectPath, "local");
    if (context?.TEAMS_APP_ID) {
      await deleteTeamsApp(context.TEAMS_APP_ID);
    }
    await cleanUpLocalProject(projectPath);
  });

  it(
    "happy path: provision and deploy",
    { testPlanCaseId: 9426074, author: "kuojianlu@microsoft.com" },
    async function () {
      // create
      await CliHelper.createProjectWithCapability(
        appName,
        testFolder,
        Capability.TabNonSso
      );
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // remove teamsApp/extendToM365 in case it fails
      removeTeamsAppExtendToM365(path.join(projectPath, "teamsapp.local.yml"));

      // provision
      await CliHelper.provisionProject(projectPath, "", "local");
      console.log(`[Successfully] provision for ${projectPath}`);

      let context = await readContextMultiEnvV3(projectPath, "local");
      chai.assert.isDefined(context);

      // validate aad
      chai.assert.isUndefined(context.AAD_APP_OBJECT_ID);

      // validate teams app
      chai.assert.isDefined(context.TEAMS_APP_ID);
      const teamsApp = await getTeamsApp(context.TEAMS_APP_ID);
      chai.assert.equal(teamsApp?.teamsAppId, context.TEAMS_APP_ID);

      // deploy
      await CliHelper.deployAll(projectPath, "", "local");
      console.log(`[Successfully] deploy for ${projectPath}`);

      context = await readContextMultiEnvV3(projectPath, "local");
      chai.assert.isDefined(context);

      // validate ssl cert
      chai.assert.isDefined(context.SSL_CRT_FILE);
      chai.assert.isNotEmpty(context.SSL_CRT_FILE);
      chai.assert.isDefined(context.SSL_KEY_FILE);
      chai.assert.isNotEmpty(context.SSL_KEY_FILE);

      // validate .localConfigs
      chai.assert.isTrue(
        await fs.pathExists(path.join(projectPath, ".localConfigs"))
      );
    }
  );
});
