// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */

import { it } from "../../commonlib/it";
import { describe } from "mocha";
import path from "path";
import { FrontendValidator } from "../../commonlib";
import { getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { M365Validator } from "../../commonlib/m365Validator";
import { Capability } from "../../commonlib/constants";
import mockedEnv from "mocked-env";
describe("Create M365 Launch Page", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  let mockedEnvRestore: () => void;

  before(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_APIV3: "true",
      TEAMSFX_M365_APP: "true",
      TEAMSFX_TEMPLATE_PRERELEASE: "alpha",
    });
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
    mockedEnvRestore();
  });

  it("happy path", async () => {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.M365SsoLaunchPage);
    await M365Validator.validateProjectSettings(projectPath);
    await M365Validator.validateManifest(projectPath);
    await FrontendValidator.validateScaffold(projectPath, "javascript");
  });
});
