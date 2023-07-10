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
import { Capability } from "../../utils/constants";
import { Cleaner } from "../../utils/cleaner";
import { Executor } from "../../utils/executor";
import { getTestFolder, getUniqueAppName } from "../commonUtils";
import { checkYmlHeader } from "./utils";

describe("upgrade", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    await Cleaner.clean(projectPath);
  });

  it(
    "upgrade project",
    { testPlanCaseId: 17184119, author: "zhaofengxu@microsoft.com" },
    async function () {
      {
        await Executor.installCLI(testFolder, "1.2.5", true);
        const env = Object.assign({}, process.env);
        env["TEAMSFX_V3"] = "false";
        // new a project ( tab only )
        await CliHelper.createProjectWithCapability(
          appName,
          testFolder,
          Capability.TabNonSso,
          env
        );
      }

      await Executor.installCLI(testFolder, "alpha", true);
      {
        // upgrade
        const result = await Executor.upgrade(projectPath);
        chai.assert.isTrue(result.success);
        const ymlFile = path.join(projectPath, "teamsapp.yml");
        await checkYmlHeader(ymlFile);
      }

      // {
      //   // preview
      //   const result = await Executor.preview(projectPath);
      //   chai.assert.isTrue(result.success);
      // }

      {
        // provision
        const result = await Executor.provision(projectPath);
        chai.assert.isTrue(result.success);
      }

      {
        // deploy
        const result = await Executor.deploy(projectPath);
        chai.assert.isTrue(result.success);
      }
    }
  );
});
