// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import {
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv,
  getUniqueAppName,
} from "../commonUtils";
import { AadValidator, FrontendValidator } from "../../commonlib";
import { TemplateProject } from "../../commonlib/constants";
import { CliHelper } from "../../commonlib/cliHelper";
import m365Login from "../../../src/commonlib/m365Login";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { isV3Enabled } from "@microsoft/teamsfx-core";
describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const subscription = getSubscriptionId();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  const env = environmentManager.getDefaultEnvName();

  it(`${TemplateProject.ContactExporter}`, { testPlanCaseId: 15277462 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    await CliHelper.createTemplateProject(
      appName,
      testFolder,
      TemplateProject.ContactExporter,
      TemplateProject.ContactExporter
    );

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    // Provision
    await setSimpleAuthSkuNameToB1Bicep(projectPath, env);
    await CliHelper.setSubscription(subscription, projectPath);
    await CliHelper.provisionProject(projectPath);

    // Validate Provision
    const context = await readContextMultiEnv(projectPath, env);
    // Validate Aad App
    const aad = AadValidator.init(context, false, m365Login);
    await AadValidator.validate(aad);

    // Validate Tab Frontend
    const frontend = FrontendValidator.init(context);
    await FrontendValidator.validateProvision(frontend);

    // deploy
    await CliHelper.deployAll(projectPath);
  });
  after(async () => {
    await cleanUp(appName, projectPath, true, false, false);
  });
});
