// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhaofeng Xu <zhaofengxu@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import { describe } from "mocha";
import * as path from "path";
import { Cleaner } from "../../utils/cleaner";
import { Capability } from "../../utils/constants";
import { Executor } from "../../utils/executor";
import { getTestFolder, getUniqueAppName } from "../commonUtils";

describe("version check", () => {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  afterEach(async function () {
    await Cleaner.clean(projectPath);
  });

  it(
    "open v5 project by cli 1.2.5",
    { testPlanCaseId: 17603383, author: "zhaofengxu@microsoft.com" },
    async function () {
      {
        const result = await Executor.createProject(
          testFolder,
          appName,
          Capability.TabNonSso,
          ProgrammingLanguage.TS
        );
        chai.assert.isTrue(result.success);
      }

      const env = Object.assign({}, process.env);
      env["TEAMSFX_V3"] = "false";
      await Executor.installCLI(testFolder, "1.2.5", true);
      const errorMessage =
        "Your TeamFx CLI version is old and it doesn't support current project, please upgrade to the latest version using command below:\nnpm install -g @microsoft/teamsfx-cli@latest";

      {
        // provision
        const result = await Executor.provisionWithCustomizedProcessEnv(
          projectPath,
          env
        );
        chai.assert.isFalse(result.success);
        chai.assert.include(result.stderr, errorMessage);
      }

      {
        // deploy
        const result = await Executor.deployWithCustomizedProcessEnv(
          projectPath,
          env
        );
        chai.assert.isFalse(result.success);
        chai.assert.include(result.stderr, errorMessage);
      }

      {
        // publish
        const result = await Executor.publishWithCustomizedProcessEnv(
          projectPath,
          env
        );
        chai.assert.isFalse(result.success);
        chai.assert.include(result.stderr, errorMessage);
      }

      {
        // preview
        const result = await Executor.previewWithCustomizedProcessEnv(
          projectPath,
          env
        );
        chai.assert.isFalse(result.success);
        chai.assert.include(result.stderr, errorMessage);
      }

      {
        // validate
        const result = await Executor.validateWithCustomizedProcessEnv(
          projectPath,
          env
        );
        chai.assert.isFalse(result.success);
        chai.assert.include(result.stderr, errorMessage);
      }
    }
  );
});
