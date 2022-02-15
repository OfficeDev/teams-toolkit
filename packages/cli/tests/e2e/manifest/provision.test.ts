// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import path from "path";
import "mocha";
import { getTestFolder, readContextMultiEnv, execAsync } from "../commonUtils";

import { environmentManager } from "@microsoft/teamsfx-core";
import { AppStudioValidator } from "../../commonlib";

describe("teamsfx provision manifest command", function () {
  const env = "e2e";
  const testFolder = getTestFolder();
  const testAppPkgPath = path.resolve(__dirname, "appPackage.dev.zip");
  const reg = /Teams app created: (.*)\n/;

  it(`should create Teams App successfully`, async function () {
    const result = await execAsync(`teamsfx provision manifest --path ${testAppPkgPath}`);
    const matchResult = result.stdout.match(reg);

    chai.assert.isTrue(matchResult !== undefined && matchResult.length > 1);
    const teamsAppId = matchResult[1];
    chai.assert.isTrue(teamsAppId.length > 0);

    AppStudioValidator.setE2ETestProvider();
    await AppStudioValidator.getApp(teamsAppId);
    await AppStudioValidator.deleteApp(teamsAppId);
  });
});
