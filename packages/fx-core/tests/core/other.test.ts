// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { FuncValidation, Inputs, Platform, Stage } from "@microsoft/teamsfx-api";
import { QuestionAppName } from "../../src/core/question";
import { assert } from "chai";
import { randomAppName } from "./utils";
import sinon from "sinon";
import fs from "fs-extra";
import os from "os";
import * as path from "path";
import { defaultSolutionLoader } from "../../src/core/loader";
import {
  FetchSampleError,
  NoneFxError,
  ProjectFolderExistError,
  ReadFileError,
  TaskNotSupportError,
  WriteFileError,
} from "../../src/core/error";
import mockedEnv from "mocked-env";
import { isArmSupportEnabled, isFeatureFlagEnabled } from "../../src/common/tools";

describe("Other test case", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it("question: QuestionAppName validation", async () => {
    const inputs: Inputs = { platform: Platform.VSCode };
    const folder = os.tmpdir();
    let appName = "1234";
    inputs.folder = folder;

    let validRes = await (QuestionAppName.validation as FuncValidation<string>).validFunc(
      appName,
      inputs
    );

    assert.isTrue(
      validRes ===
        "Application name must start with a letter and can only contain letters and digits."
    );

    appName = randomAppName();
    const projectPath = path.resolve(folder, appName);

    sandbox.stub<any, any>(fs, "pathExists").withArgs(projectPath).resolves(true);

    validRes = await (QuestionAppName.validation as FuncValidation<string>).validFunc(
      appName,
      inputs
    );
    assert.isTrue(validRes === `Path exists: ${projectPath}. Select a different application name.`);

    sandbox.restore();
    sandbox.stub<any, any>(fs, "pathExists").withArgs(projectPath).resolves(false);

    validRes = await (QuestionAppName.validation as FuncValidation<string>).validFunc(
      appName,
      inputs
    );
    assert.isTrue(validRes === undefined);
  });

  it("loader: DefaultSolutionLoader", async () => {
    const inputs: Inputs = { platform: Platform.VSCode };
    const solution = await defaultSolutionLoader.loadSolution(inputs);
    assert.isTrue(solution.name === "fx-solution-azure");
    const solutions = await defaultSolutionLoader.loadGlobalSolutions(inputs);
    assert.isTrue(solutions.length === 1 && solutions[0].name === "fx-solution-azure");
  });

  it("error: ProjectFolderExistError", async () => {
    const error = ProjectFolderExistError(os.tmpdir());
    assert.isTrue(error.name === "ProjectFolderExistError");
    assert.isTrue(
      error.message === `Path ${os.tmpdir()} alreay exists. Select a different folder.`
    );
  });

  it("error: WriteFileError", async () => {
    const msg = "file not exist";
    const error = WriteFileError(new Error(msg));
    assert.isTrue(error.name === "WriteFileError");
    assert.isTrue(error.message === `write file error ${msg}`);
  });

  it("error: ReadFileError", async () => {
    const msg = "file not exist";
    const error = ReadFileError(new Error(msg));
    assert.isTrue(error.name === "ReadFileError");
    assert.isTrue(error.message === `read file error ${msg}`);
  });

  it("error: NoneFxError", async () => {
    const msg = "hahahaha";
    const error = NoneFxError(new Error(msg));
    assert.isTrue(error.name === "NoneFxError");
    assert.isTrue(error.message === `NoneFxError ${msg}`);
  });

  it("error: TaskNotSupportError", async () => {
    const error = TaskNotSupportError(Stage.createEnv);
    assert.isTrue(error.name === "TaskNotSupport");
    assert.isTrue(error.message === `Task is not supported yet: ${Stage.createEnv}`);
  });

  it("error: FetchSampleError", async () => {
    const error = FetchSampleError();
    assert.isTrue(error.name === "FetchSampleError");
    assert.isTrue(error.message === "Failed to download sample app");
  });

  it("isFeatureFlagEnabled: return true when related environment variable is set to 1 or true", () => {
    const featureFlagName = "FEATURE_FLAG_UNIT_TEST";

    let restore = mockedEnv({
      [featureFlagName]: "1",
    });
    assert.isTrue(isFeatureFlagEnabled(featureFlagName));
    assert.isTrue(isFeatureFlagEnabled(featureFlagName, false)); // default value should be override
    restore();

    restore = mockedEnv({
      [featureFlagName]: "true",
    });
    assert.isTrue(isFeatureFlagEnabled(featureFlagName));
    restore();

    restore = mockedEnv({
      [featureFlagName]: "TruE", // should allow some characters be upper case
    });
    assert.isTrue(isFeatureFlagEnabled(featureFlagName));
    restore();
  });

  it("isFeatureFlagEnabled: return default value when related environment variable is not set", () => {
    const featureFlagName = "FEATURE_FLAG_UNIT_TEST";

    const restore = mockedEnv({
      [featureFlagName]: undefined, // delete it from process.env
    });
    assert.isFalse(isFeatureFlagEnabled(featureFlagName));
    assert.isFalse(isFeatureFlagEnabled(featureFlagName, false));
    assert.isTrue(isFeatureFlagEnabled(featureFlagName, true));
    restore();
  });

  it("isFeatureFlagEnabled: return false when related environment variable is set to non 1 or true value", () => {
    const featureFlagName = "FEATURE_FLAG_UNIT_TEST";

    let restore = mockedEnv({
      [featureFlagName]: "one",
    });
    assert.isFalse(isFeatureFlagEnabled(featureFlagName));
    assert.isFalse(isFeatureFlagEnabled(featureFlagName, true)); // default value should be override
    restore();

    restore = mockedEnv({
      [featureFlagName]: "",
    });
    assert.isFalse(isFeatureFlagEnabled(featureFlagName));
    restore();
  });

  it("isArmSupportEnabled: return correct result based on environment variable value", () => {
    const armSupportFeatureFlagName = "TEAMSFX_ARM_SUPPORT";

    let restore = mockedEnv({
      [armSupportFeatureFlagName]: undefined,
    });
    assert.isFalse(isArmSupportEnabled());
    restore();

    restore = mockedEnv({
      [armSupportFeatureFlagName]: "",
    });
    assert.isFalse(isArmSupportEnabled());
    restore();

    restore = mockedEnv({
      [armSupportFeatureFlagName]: "true",
    });
    assert.isTrue(isArmSupportEnabled());
    restore();
  });
});
