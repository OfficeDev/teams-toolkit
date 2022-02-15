// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import path from "path";
import "mocha";
import { execAsync } from "../commonUtils";

import { AppStudioValidator } from "../../commonlib";

describe("teamsfx provision manifest command", function () {
  const testAppPkgPath = path.resolve(__dirname, "appPackage.dev.zip");
  const createAppReg = /Teams app created: (.*)\n/;
  const updateAppReg = /Teams app updated: (.*)\n/;

  it(`should create Teams App successfully`, async function () {
    const createAppResult = await execAsync(
      `teamsfx provision manifest --file-path ${testAppPkgPath}`
    );
    const createAppMatchResult = createAppResult.stdout.match(createAppReg);

    chai.assert.isTrue(createAppMatchResult !== undefined && createAppMatchResult!.length > 1);
    const teamsAppId = createAppMatchResult![1];
    chai.assert.isTrue(teamsAppId.length > 0);

    AppStudioValidator.setE2ETestProvider();
    await AppStudioValidator.getApp(teamsAppId);

    // Since app has been created, the second run should update the app
    const updateAppResult = await execAsync(
      `teamsfx provision manifest --file-path ${testAppPkgPath}`
    );
    const updateAppMatchResult = updateAppResult.stdout.match(updateAppReg);

    chai.assert.isTrue(updateAppMatchResult !== undefined && updateAppMatchResult!.length > 1);
    const updatedTeamsAppId = updateAppMatchResult![1];
    chai.assert.equal(updatedTeamsAppId, teamsAppId);

    await AppStudioValidator.deleteApp(teamsAppId);
  });
});
