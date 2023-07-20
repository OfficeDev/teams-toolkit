// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { it } from "@microsoft/extra-shot-mocha";
import { getTestFolder, getUniqueAppName } from "../commonUtils";
import { TemplateProjectFolder } from "../../utils/constants";
import { Executor } from "../../utils/executor";
import { Cleaner } from "../../commonlib/cleaner";

describe("teamsfx new template", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  it(
    `${TemplateProjectFolder.IncomingWebhook}`,
    { testPlanCaseId: 15277475, author: "v-ivanchen@microsoft.com" },
    async function () {
      await Executor.openTemplateProject(
        appName,
        testFolder,
        TemplateProjectFolder.IncomingWebhook
      );
      expect(fs.pathExistsSync(projectPath)).to.be.true;
      expect(
        fs.pathExistsSync(path.resolve(projectPath, "src", "adaptiveCards"))
      ).to.be.true;
    }
  );

  after(async () => {
    await Cleaner.clean(projectPath);
  });
});
