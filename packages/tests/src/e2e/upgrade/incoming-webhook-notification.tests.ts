// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import * as chai from "chai";
import { describe } from "mocha";
import * as path from "path";
import { CliHelper } from "../../commonlib/cliHelper";
import { TemplateProject } from "../../commonlib/constants";
import { Executor } from "../../utils/executor";
import { getTestFolder, getUniqueAppName } from "../commonUtils";
import fs from "fs-extra";

describe("upgrade", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    await fs.remove(projectPath);
  });

  it(
    "sample incoming webhook notification",
    { testPlanCaseId: 19298763, author: "zhaofengxu@microsoft.com" },
    async function () {
      {
        await Executor.installCLI(testFolder, "1.2.5", true);
        const env = Object.assign({}, process.env);
        env["TEAMSFX_V3"] = "false";
        // new projiect
        await CliHelper.createTemplateProject(
          appName,
          testFolder,
          TemplateProject.IncomingWebhook,
          env
        );
      }

      await Executor.installCLI(testFolder, "alpha", true);
      {
        // provision
        const result = await Executor.provision(projectPath);
        chai.assert.isFalse(result.success);
        chai.assert.include(
          result.stderr,
          "This command only works for project created by Teams Toolkit"
        );
      }
    }
  );
});
