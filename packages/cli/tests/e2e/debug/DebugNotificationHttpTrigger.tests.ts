// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import { describe } from "mocha";
import * as path from "path";

import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { envUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";
import { setTools } from "@microsoft/teamsfx-core/build/core/globalVars";

import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { cleanUpLocalProject, getTestFolder, getUniqueAppName } from "../commonUtils";
import { deleteAadAppByClientId, deleteBot, deleteTeamsApp } from "./clean";

describe("Debug V3 notification-http-trigger template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  setTools({} as any);

  afterEach(async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    const envRes = await envUtil.readEnv(projectPath, "local", false);
    chai.assert.isTrue(envRes.isOk());
    if (envRes.isOk()) {
      await deleteTeamsApp(envRes.value.TEAMS_APP_ID);
      await deleteBot(envRes.value.BOT_ID);
      await deleteAadAppByClientId(envRes.value.BOT_ID);
    }
    await cleanUpLocalProject(projectPath);
  });

  it("happy path: provision and deploy", { testPlanCaseId: 17449529 }, async function () {
    if (!isV3Enabled()) {
      this.skip();
    }

    await CliHelper.createProjectWithCapability(
      appName,
      testFolder,
      Capability.Notification,
      undefined,
      "--bot-host-type-trigger http-functions"
    );
    console.log(`[Successfully] scaffold to ${projectPath}`);

    await CliHelper.provisionProject(
      projectPath,
      "--env local",
      Object.assign({}, process.env, {
        BOT_DOMAIN: "test.ngrok.io",
        BOT_ENDPOINT: "https://test.ngrok.io",
      })
    );
    const envRes = await envUtil.readEnv(projectPath, "local", false);
    chai.assert.isTrue(envRes.isOk());
    if (envRes.isOk()) {
      chai.assert.isTrue(
        envRes.value.TEAMS_APP_ID !== undefined && envRes.value.TEAMS_APP_ID !== ""
      );
      chai.assert.isTrue(envRes.value.BOT_ID !== undefined && envRes.value.BOT_ID !== "");
    }
    console.log(`[Successfully] provision for ${projectPath}`);

    await CliHelper.deployAll(projectPath, "--env local");
    console.log(`[Successfully] deploy for ${projectPath}`);
  });
});
