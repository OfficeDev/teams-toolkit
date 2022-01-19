// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import path from "path";
import fs from "fs-extra";
import * as chai from "chai";
import { getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import "mocha";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability, Resource } from "../../commonlib/constants";

// test case for bug https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/12836125
describe("Scaffold Tab then Add Function and SQL", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    // No provision was done. Only project files need to be cleaned up.
    await cleanUpLocalProject(projectPath);
  });

  it("should generate correct localSettings file", async () => {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Tab);

    await CliHelper.addResourceToProject(projectPath, Resource.AzureFunction);
    await CliHelper.addResourceToProject(projectPath, Resource.AzureSql);

    const localSettingsPath = path.resolve(projectPath, ".fx", "configs", "localSettings.json");
    const localSettings = await fs.readJSON(localSettingsPath);
    chai.assert.isTrue(localSettings["backend"] != undefined);
    chai.assert.hasAllKeys(localSettings["backend"], [
      "functionEndpoint",
      "functionName",
      "sqlEndpoint",
      "sqlDatabaseName",
      "sqlUserName",
      "sqlPassword",
    ]);
  });
});
