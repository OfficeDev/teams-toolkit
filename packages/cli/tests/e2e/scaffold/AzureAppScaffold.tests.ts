// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhijie Huang <zhijie.huang@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { expect } from "chai";
import { describe } from "mocha";
import path from "path";
import { FrontendValidator } from "../../commonlib";
import { Cleaner } from "../../utils/cleaner";
import { Capability } from "../../utils/constants";
import { Executor } from "../../utils/executor";
import { getTestFolder, getUniqueAppName } from "../commonUtils";

describe("Azure App Scaffold", function () {
  let testFolder: string;
  let appName: string;
  let projectPath: string;

  // Should succeed on the 3rd try
  this.retries(2);

  beforeEach(() => {
    testFolder = getTestFolder();
    appName = getUniqueAppName();
    projectPath = path.resolve(testFolder, appName);
  });

  afterEach(async () => {
    await Cleaner.clean(testFolder);
  });

  it(
    `Tab + Bot + Function in TypeScript`,
    { testPlanCaseId: 24137753, author: "zhijie.huang@microsoft.com" },
    async function () {
      {
        const result = await Executor.createProject(
          testFolder,
          appName,
          Capability.TabNonSso,
          ProgrammingLanguage.TS
        );
        expect(result.success).to.be.true;
      }
    }
  );
});
