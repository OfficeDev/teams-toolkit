// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import { describe } from "mocha";
import * as chai from "chai";
import fs from "fs-extra";
import path from "path";
import { environmentManager } from "@microsoft/teamsfx-core";
import { getSubscriptionId, getTestFolder, getUniqueAppName, cleanUp } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import mockedEnv, { RestoreFn } from "mocked-env";

describe(".NET projects", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const subscription = getSubscriptionId();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  after(async () => {
    // clean up
    await cleanUp(appName, projectPath, false, false, false);
  });
  describe("teamsfx new a .NET project", async function () {
    const envs = [{ TEAMSFX_CLI_DOTNET: "true" }];
    let mockedEnvRestore: RestoreFn;
    for (const envParam of envs) {
      beforeEach(() => {
        mockedEnvRestore = mockedEnv(envParam);
      });
      afterEach(() => {
        mockedEnvRestore();
      });
      it(`should create a .NET project`, async () => {
        await CliHelper.createDotNetProject(appName, testFolder, Capability.Tab);
        const programCsPath = path.join(testFolder, appName, "App.razor");
        chai.assert.isTrue(await fs.pathExists(programCsPath));
      });
    }
  });
});
