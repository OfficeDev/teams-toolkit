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
import { M365AppType } from "../../commonlib/constants";
import { M365Validator } from "../../commonlib/m365Validator";

describe("Create M365 Messaging Extension", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  before(() => {
    process.env.TEAMSFX_M365_APP = "true";
    process.env.TEAMSFX_TEMPLATE_PRERELEASE = "alpha";
  });

  after(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });

  it("happy path", async () => {
    await CliHelper.createM365ProjectWithAppType(
      appName,
      testFolder,
      M365AppType.MessagingExtension
    );
    await M365Validator.validateProjectSettings(projectPath);
    await M365Validator.validateManifest(projectPath);
  });
});
