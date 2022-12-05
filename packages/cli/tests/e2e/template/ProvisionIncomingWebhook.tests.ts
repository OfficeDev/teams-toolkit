// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { getTestFolder, cleanUp, getUniqueAppName } from "../commonUtils";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(`${TemplateProject.IncomingWebhook}`, { testPlanCaseId: 15277475 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    await CliHelper.createTemplateProject(
      appName,
      testFolder,
      TemplateProject.IncomingWebhook,
      TemplateProject.IncomingWebhook
    );

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;
  });

  after(async () => {
    await cleanUp(appName, projectPath, false, false, false);
  });
});
