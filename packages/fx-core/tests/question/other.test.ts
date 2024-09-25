// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { environmentNameManager } from "../../src/core/environmentName";
import { QuestionNames } from "../../src/question/constants";
import { selectTargetEnvQuestion } from "../../src/question/other";

describe("env question", () => {
  it("should not show testtool env", async () => {
    const dynamicOptions = selectTargetEnvQuestion(
      QuestionNames.TargetEnvName,
      false
    ).dynamicOptions;
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    if (dynamicOptions) {
      const envs = (await dynamicOptions(inputs)) as string[];
      assert.notInclude(envs, environmentNameManager.getTestToolEnvName());
    }
  });

  it("should not show testtool env for non-remote", async () => {
    const dynamicOptions = selectTargetEnvQuestion(
      QuestionNames.TargetEnvName,
      true
    ).dynamicOptions;
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    if (dynamicOptions) {
      const envs = (await dynamicOptions(inputs)) as string[];
      assert.notInclude(envs, environmentNameManager.getTestToolEnvName());
    }
  });
});
