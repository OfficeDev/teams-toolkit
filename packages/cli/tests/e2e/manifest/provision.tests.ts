// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import path from "path";
import { describe } from "mocha";
import * as chai from "chai";
import { execAsync } from "../commonUtils";

import { AppStudioValidator } from "../../commonlib";
import { it } from "../../commonlib/it";

describe("teamsfx provision manifest command", function () {
  const testAppPkgPath = path.resolve(__dirname, "appPackage.dev.zip");
  const createAppReg = /teams app created: (.*)\n/;
  const updateAppReg = /teams app updated: (.*)\n/;
  // This id is specified by the zip file at testAppPkgPath
  const testTeamsAppId = "1befd3b2-4441-4a3a-be6c-b4ad95334d6f";

  before(async () => {
    AppStudioValidator.setE2ETestProvider();
    if (await AppStudioValidator.checkWetherAppExists(testTeamsAppId)) {
      await AppStudioValidator.deleteApp(testTeamsAppId);
      console.log(`Teams App ${testTeamsAppId} has been deleted`);
    }
  });

  it(
    `should create Teams App then update it successfully`,
    { testPlanCaseId: 13395709 },
    async function () {
      const createAppResult = await execAsync(
        `teamsfx provision manifest --file-path ${testAppPkgPath} --verbose`
      );
      const createAppMatchResult = createAppResult.stdout.match(createAppReg);
      console.log(`create app stdout: ${createAppResult.stdout}`);

      chai.assert.isTrue(
        createAppMatchResult !== undefined &&
          createAppMatchResult !== null &&
          createAppMatchResult!.length > 1
      );
      const teamsAppId = createAppMatchResult![1];
      chai.assert.isTrue(teamsAppId.length > 0);

      console.log(`extracted teamsApp: ${teamsAppId}`);
      AppStudioValidator.setE2ETestProvider();
      chai.assert.isTrue(await AppStudioValidator.checkWetherAppExists(teamsAppId));

      // Since app has been created, the second run should update the app
      const updateAppResult = await execAsync(
        `teamsfx provision manifest --file-path ${testAppPkgPath} --verbose`
      );
      console.log(`update app stdout: ${updateAppResult.stdout}`);
      const updateAppMatchResult = updateAppResult.stdout.match(updateAppReg);

      chai.assert.isTrue(
        updateAppMatchResult !== undefined &&
          updateAppMatchResult !== null &&
          updateAppMatchResult!.length > 1
      );
      const updatedTeamsAppId = updateAppMatchResult![1];
      chai.assert.equal(updatedTeamsAppId, teamsAppId);

      await AppStudioValidator.deleteApp(teamsAppId);
      console.log(`Teams App ${teamsAppId} has been deleted`);
    }
  );
});
