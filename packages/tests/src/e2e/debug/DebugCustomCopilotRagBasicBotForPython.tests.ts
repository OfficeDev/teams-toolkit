// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Frank Qian <frankqian@microsoft.com>
 */

import * as chai from "chai";
import * as fs from "fs-extra";
import { describe } from "mocha";
import * as path from "path";

import { it } from "@microsoft/extra-shot-mocha";

import { CliHelper } from "../../commonlib/cliHelper";
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
} from "./utility";
import { execAsync } from "../../utils/commonUtils";

describe("Debug V3 command-and-response template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
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

  it(
    "Azure OpenAI happy path: provision and deploy",
    { testPlanCaseId: 27551381, author: "frankqian@microsoft.com" },
    async function () {
      // create
      const myRecordAzOpenAI: Record<string, string> = {};
      myRecordAzOpenAI["programming-language"] = "python ";
      myRecordAzOpenAI["custom-copilot-rag"] = "custom-copilot-rag-customize";
      myRecordAzOpenAI["llm-service"] = "llm-service-azure-openai";
      myRecordAzOpenAI["azure-openai-key"] = "fake";
      myRecordAzOpenAI["azure-openai-deployment-name"] = "fake";
      myRecordAzOpenAI["azure-openai-endpoint"] = "https://test.com";
      const options = Object.entries(myRecordAzOpenAI)
        .map(([key, value]) => "--" + key + " " + value)
        .join(" ");
      await CliHelper.createProjectWithCapability(
        appName,
        testFolder,
        "custom-copilot-rag" as any,
        undefined,
        options
      );
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // create venv and pip install
      const command = `python3 -m venv ./venv && . ./venv/bin/activate && pip install -r ./src/requirements.txt`;
      const timeout = 200000;
      await execAsync(command, {
        cwd: projectPath,
        env: process.env,
        timeout: timeout,
      });

      // provision
      await CliHelper.provisionProject(projectPath, "", "local", {
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
      chai.assert.isDefined(aadApp);
      chai.assert.equal(aadApp?.appId, context.BOT_ID);
      const bot = await getBot(context.BOT_ID);
      chai.assert.equal(bot?.botId, context.BOT_ID);
      chai.assert.equal(
        bot?.messagingEndpoint,
        "https://test.ngrok.io/api/messages"
      );
      chai.assert.deepEqual(bot?.configuredChannels, ["msteams"]);

      // validate teams app
      chai.assert.isDefined(context.TEAMS_APP_ID);
      const teamsApp = await getTeamsApp(context.TEAMS_APP_ID);
      chai.assert.equal(teamsApp?.teamsAppId, context.TEAMS_APP_ID);

      // deploy
      await CliHelper.deployAll(projectPath, "", "local");
      console.log(`[Successfully] deploy for ${projectPath}`);

      context = await readContextMultiEnvV3(projectPath, "local");
      chai.assert.isDefined(context);

      // validate .env
      chai.assert.isTrue(await fs.pathExists(path.join(projectPath, ".env")));
    }
  );

  it(
    "Azure OpenAI happy path: provision and deploy",
    { testPlanCaseId: 27551384, author: "frankqian@microsoft.com" },
    async function () {
      // create
      const myRecordAzOpenAI: Record<string, string> = {};
      myRecordAzOpenAI["programming-language"] = "python ";
      myRecordAzOpenAI["custom-copilot-rag"] = "custom-copilot-rag-customize";
      myRecordAzOpenAI["llm-service"] = "llm-service-openai";
      myRecordAzOpenAI["openai-key"] = "fake";
      const options = Object.entries(myRecordAzOpenAI)
        .map(([key, value]) => "--" + key + " " + value)
        .join(" ");
      await CliHelper.createProjectWithCapability(
        appName,
        testFolder,
        "custom-copilot-rag" as any,
        undefined,
        options
      );
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // create venv and pip install
      const command = `python3 -m venv ./venv && . ./venv/bin/activate && pip install -r ./src/requirements.txt`;
      const timeout = 200000;
      await execAsync(command, {
        cwd: projectPath,
        env: process.env,
        timeout: timeout,
      });

      // provision
      await CliHelper.provisionProject(projectPath, "", "local", {
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
      chai.assert.isDefined(aadApp);
      chai.assert.equal(aadApp?.appId, context.BOT_ID);
      const bot = await getBot(context.BOT_ID);
      chai.assert.equal(bot?.botId, context.BOT_ID);
      chai.assert.equal(
        bot?.messagingEndpoint,
        "https://test.ngrok.io/api/messages"
      );
      chai.assert.deepEqual(bot?.configuredChannels, ["msteams"]);

      // validate teams app
      chai.assert.isDefined(context.TEAMS_APP_ID);
      const teamsApp = await getTeamsApp(context.TEAMS_APP_ID);
      chai.assert.equal(teamsApp?.teamsAppId, context.TEAMS_APP_ID);

      // deploy
      await CliHelper.deployAll(projectPath, "", "local");
      console.log(`[Successfully] deploy for ${projectPath}`);

      context = await readContextMultiEnvV3(projectPath, "local");
      chai.assert.isDefined(context);

      // validate .env
      chai.assert.isTrue(await fs.pathExists(path.join(projectPath, ".env")));
    }
  );
});
