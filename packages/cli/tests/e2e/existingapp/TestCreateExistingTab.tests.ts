// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Qinen Zhu <qinzhu@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { describe } from "mocha";
import path from "path";
import { getTestFolder, getUniqueAppName, cleanUpLocalProject } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import mockedEnv, { RestoreFn } from "mocked-env";
import { ExistingAppValidator } from "../../commonlib/existingAppValidator";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Create existing tab app", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  let mockedEnvRestore: RestoreFn;

  before(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_INIT_APP: "true",
    });
  });

  after(async () => {
    mockedEnvRestore();
    await cleanUpLocalProject(projectPath);
  });

  it(
    "Create existing tab app with default endpoint",
    { testPlanCaseId: 15685986 },
    async function () {
      if (isV3Enabled()) {
        this.skip();
      }

      await CliHelper.createProjectWithCapability(appName, testFolder, Capability.ExistingTab);
      // Validate
      await ExistingAppValidator.validateProjectSettings(projectPath);
      await ExistingAppValidator.validateEnvConfig(projectPath);
      await ExistingAppValidator.validateManifest(projectPath);
    }
  );

  it("Provision existing tab app", { testPlanCaseId: 15685987 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }

    await CliHelper.provisionProject(projectPath);
    // Validate
    await ExistingAppValidator.validateStateFile(projectPath);
  });
});
