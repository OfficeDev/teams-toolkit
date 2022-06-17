// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */

import { it } from "../../commonlib/it";
import { describe } from "mocha";
import path from "path";
import { getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { M365Validator } from "../../commonlib/m365Validator";
import { BotValidator } from "../../commonlib";
import { Capability } from "../../commonlib/constants";

describe("Create M365 Message Extension", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const originalTemplatePrerelease = process.env.TEAMSFX_TEMPLATE_PRERELEASE;

  before(() => {
    process.env.TEAMSFX_M365_APP = "true";
    process.env.TEAMSFX_TEMPLATE_PRERELEASE = "alpha";
  });

  after(async () => {
    process.env.TEAMSFX_M365_APP = "false";
    process.env.TEAMSFX_TEMPLATE_PRERELEASE = originalTemplatePrerelease;
    // clean up
    await cleanUpLocalProject(projectPath);
  });

  it("happy path", async () => {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.M365SearchApp);
    await M365Validator.validateProjectSettings(projectPath);
    await M365Validator.validateManifest(projectPath);
    await BotValidator.validateScaffold(projectPath, "javascript");
  });
});
