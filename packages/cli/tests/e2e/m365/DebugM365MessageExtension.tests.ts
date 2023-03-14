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

import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import {
  cleanUpLocalProject,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
} from "../commonUtils";
import {
  deleteAadAppByClientId,
  deleteBot,
  deleteTeamsApp,
  getAadAppByClientId,
  getBot,
  getTeamsApp,
} from "../debug/utility";

describe("Debug V3 m365-message-extension template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    const context = await readContextMultiEnvV3(projectPath, "local");

    // clean up
    if (context?.TEAMS_APP_ID) {
      await deleteTeamsApp(context.TEAMS_APP_ID);
    }
    if (context?.BOT_ID) {
      await deleteBot(context.BOT_ID);
      await deleteAadAppByClientId(context.BOT_ID);
    }
    await cleanUpLocalProject(projectPath);
  });

  it("happy path: provision and deploy", { testPlanCaseId: 17449538 }, async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    // create
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.M365SearchApp);
    console.log(`[Successfully] scaffold to ${projectPath}`);

    // provision
    await CliHelper.provisionProject(projectPath, "--env local", {
      ...process.env,
      BOT_DOMAIN: "test.ngrok.io",
      BOT_ENDPOINT: "https://test.ngrok.io",
    });
    console.log(`[Successfully] provision for ${projectPath}`);

    let context = await readContextMultiEnvV3(projectPath, "local");
    chai.assert.isDefined(context);

    // validate bot
    chai.assert.isDefined(context.BOT_ID);
    chai.assert.isNotEmpty(context.BOT_ID);
    const aadApp = await getAadAppByClientId(context.BOT_ID);
    chai.assert.equal(aadApp?.id, context.BOT_ID);
    const bot = await getBot(context.BOT_ID);
    chai.assert.equal(bot?.botId, context.BOT_ID);
    chai.assert.equal(bot?.messagingEndpoint, "https://test.ngrok.io/api/messages");
    chai.assert.deepEqual(bot?.configuredChannels, ["msteams", "m365extensions"]);

    // validate teams app
    chai.assert.isDefined(context.TEAMS_APP_ID);
    const teamsApp = await getTeamsApp(context.TEAMS_APP_ID);
    chai.assert.equal(teamsApp?.teamsAppId, context.TEAMS_APP_ID);

    // validate m365
    chai.assert.isDefined(context.M365_TITLE_ID);
    chai.assert.isNotEmpty(context.M365_TITLE_ID);
    chai.assert.isDefined(context.M365_APP_ID);
    chai.assert.isNotEmpty(context.M365_APP_ID);

    // deploy
    await CliHelper.deployAll(projectPath, "--env local");
    console.log(`[Successfully] deploy for ${projectPath}`);

    context = await readContextMultiEnvV3(projectPath, "local");
    chai.assert.isDefined(context);

    // validate .localSettings
    chai.assert.isTrue(await fs.pathExists(path.join(projectPath, ".localSettings")));
  });
});
