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
  execAsync,
  getTestFolder,
  cleanUp,
  setSimpleAuthSkuNameToB1Bicep,
  getSubscriptionId,
  readContextMultiEnv
} from "../commonUtils";
import {
  FrontendValidator
} from "../../commonlib"
import { TemplateProject } from "../../commonlib/constants"
import { CliHelper } from "../../commonlib/cliHelper";

import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";

describe("teamsfx new template", function () {
  let appName: string;
  let testFolder: string;
  let projectPath: string;

  const env = environmentManager.getDefaultEnvName();
  const subscription = getSubscriptionId();
  beforeEach(async () => {
    testFolder = getTestFolder();
  });

  it(`${TemplateProject.IncomingWebhook}`, { testPlanCaseId: 15277472 }, async function () {
    projectPath = path.resolve(testFolder, TemplateProject.IncomingWebhook);
    await execAsync(`teamsfx new template ${TemplateProject.IncomingWebhook}`, {
      cwd: testFolder,
      env: process.env,
      timeout: 0,
    });

    expect(fs.pathExistsSync(projectPath)).to.be.true;
    expect(fs.pathExistsSync(path.resolve(projectPath, ".fx"))).to.be.true;

    await execAsync(`npm install && npm run build`, {
      cwd: path.join(testFolder, 'incoming-webhook'),
      env: process.env,
      timeout: 0,
    });


    await cleanUp(appName, projectPath, false, false, false);

  });

});
