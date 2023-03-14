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
import { isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";

import m365Provider from "../../../src/commonlib/m365LoginUserPassword";
import { AadValidator } from "../../commonlib/aadValidate";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import {
  cleanUpLocalProject,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
} from "../commonUtils";
import { deleteAadAppByObjectId, deleteTeamsApp, getTeamsApp } from "./utility";

describe("Debug V3 sso-tab template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    // clean up
    const context = await readContextMultiEnvV3(projectPath, "local");
    if (context?.TEAMS_APP_ID) {
      await deleteTeamsApp(context.TEAMS_APP_ID);
    }
    if (context?.AAD_APP_OBJECT_ID) {
      await deleteAadAppByObjectId(context.AAD_APP_OBJECT_ID);
    }
    await cleanUpLocalProject(projectPath);
  });

  it("happy path: provision and deploy", { testPlanCaseId: 17449525 }, async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    // create
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);
    console.log(`[Successfully] scaffold to ${projectPath}`);

    // provision
    await CliHelper.provisionProject(projectPath, "--env local");
    console.log(`[Successfully] provision for ${projectPath}`);

    let context = await readContextMultiEnvV3(projectPath, "local");
    chai.assert.isDefined(context);

    // validate aad
    chai.assert.isDefined(context.AAD_APP_OBJECT_ID);
    chai.assert.isNotEmpty(context.AAD_APP_OBJECT_ID);
    const aad = AadValidator.init(context, false, m365Provider);
    await AadValidator.validate(aad);

    // validate teams app
    chai.assert.isDefined(context.TEAMS_APP_ID);
    const teamsApp = await getTeamsApp(context.TEAMS_APP_ID);
    chai.assert.equal(teamsApp?.teamsAppId, context.TEAMS_APP_ID);

    // deploy
    await CliHelper.deployAll(projectPath, "--env local");
    console.log(`[Successfully] deploy for ${projectPath}`);

    context = await readContextMultiEnvV3(projectPath, "local");
    chai.assert.isDefined(context);

    // validate ssl cert
    chai.assert.isDefined(context.SSL_CRT_FILE);
    chai.assert.isNotEmpty(context.SSL_CRT_FILE);
    chai.assert.isDefined(context.SSL_KEY_FILE);
    chai.assert.isNotEmpty(context.SSL_KEY_FILE);

    // validate .localSettings
    chai.assert.isTrue(await fs.pathExists(path.join(projectPath, ".localSettings")));
  });
});
