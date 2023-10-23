// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */

import { describe } from "mocha";
import * as chai from "chai";
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
import { deleteTeamsApp, getTeamsApp } from "../debug/utility";

describe("Deploy V3 api-based-message-extension template", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    // clean up
    const context = await readContextMultiEnvV3(projectPath, "dev");
    if (context?.TEAMS_APP_ID) {
      await deleteTeamsApp(context.TEAMS_APP_ID);
    }

    await cleanUpLocalProject(projectPath);
  });

  it(
    "happy path: scaffold and provision",
    { testPlanCaseId: 17449554, author: "yuqzho@microsoft.com" },
    async function () {
      const e2eTestFolder = "";

      // create
      await CliHelper.createProjectWithCapability(
        appName,
        testFolder,
        Capability.M365SearchApp,
        undefined,
        '--me-architecture api-spec --openapi-spec-location "./apispec.yml" --api-operation "GET /repairs"'
      );
      console.log(`[Successfully] scaffold to ${projectPath}`);

      // provision

      await CliHelper.provisionProject(projectPath, "", "dev", {
        ...process.env,
      });
      console.log(`[Successfully] provision for ${projectPath}`);

      const context = await readContextMultiEnvV3(projectPath, "dev");
      chai.assert.isDefined(context);

      // validate teams app
      chai.assert.isDefined(context.TEAMS_APP_ID);
      const teamsApp = await getTeamsApp(context.TEAMS_APP_ID);
      chai.assert.equal(teamsApp?.teamsAppId, context.TEAMS_APP_ID);

      // validate m365
      chai.assert.isDefined(context.M365_TITLE_ID);
      chai.assert.isNotEmpty(context.M365_TITLE_ID);
      chai.assert.isDefined(context.M365_APP_ID);
      chai.assert.isNotEmpty(context.M365_APP_ID);
    }
  );
});
