// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */

import { describe } from "mocha";
import * as chai from "chai";
import * as path from "path";

import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";

import m365Provider from "../../../src/commonlib/m365LoginUserPassword";
import { AadValidator } from "../../commonlib/aadValidate";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { FrontendValidator } from "../../commonlib/frontendValidator";
import {
  cleanUpLocalProject,
  createResourceGroup,
  deleteResourceGroupByName,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
} from "../commonUtils";
import { deleteAadAppByObjectId, deleteTeamsApp, getTeamsApp } from "../debug/utility";

describe("Deploy V3 m365-tab template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const resourceGroupName = `${appName}-rg`;

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
    await deleteResourceGroupByName(resourceGroupName);
    await cleanUpLocalProject(projectPath);
  });

  it("happy path: provision and deploy", { testPlanCaseId: 17449539 }, async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    // create
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.M365SsoLaunchPage);
    console.log(`[Successfully] scaffold to ${projectPath}`);

    // provision
    const result = await createResourceGroup(resourceGroupName, "eastus");
    chai.assert.isTrue(result);

    await CliHelper.provisionProject(projectPath, "--interactive false --env dev", {
      ...process.env,
      AZURE_RESOURCE_GROUP_NAME: resourceGroupName,
    });
    console.log(`[Successfully] provision for ${projectPath}`);

    let context = await readContextMultiEnvV3(projectPath, "dev");
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

    // validate tab
    let frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // validate m365
    chai.assert.isDefined(context.M365_TITLE_ID);
    chai.assert.isNotEmpty(context.M365_TITLE_ID);
    chai.assert.isDefined(context.M365_APP_ID);
    chai.assert.isNotEmpty(context.M365_APP_ID);

    // deploy
    await CliHelper.deployAll(projectPath, "--interactive false --env dev");
    console.log(`[Successfully] deploy for ${projectPath}`);

    context = await readContextMultiEnvV3(projectPath, "dev");
    chai.assert.isDefined(context);

    // validate tab
    frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);
    await FrontendValidator.validateDeploy(frontend);
  });
});
