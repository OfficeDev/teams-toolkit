// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FuncValidation,
  Inputs,
  Platform,
  Stage,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import os from "os";
import * as path from "path";
import sinon from "sinon";
import Container from "typedi";
import { FeatureFlagName } from "../../src/common/constants";
import { readJson } from "../../src/common/fileUtils";
import {
  isArmSupportEnabled,
  isFeatureFlagEnabled,
  isMultiEnvEnabled,
} from "../../src/common/tools";
import {
  ContextUpgradeError,
  FetchSampleError,
  NoneFxError,
  ProjectFolderExistError,
  ReadFileError,
  TaskNotSupportError,
  WriteFileError,
} from "../../src/core/error";
import { QuestionAppName } from "../../src/core/question";
import {
  getAllSolutionPluginsV2,
  getSolutionPluginByName,
  getSolutionPluginV2ByName,
  SolutionPlugins,
  SolutionPluginsV2,
} from "../../src/core/SolutionPluginContainer";
import { parseTeamsAppTenantId } from "../../src/plugins/solution/fx-solution/v2/utils";
import { randomAppName } from "./utils";

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

  it("error: ProjectFolderExistError", async () => {
    const error = ProjectFolderExistError(os.tmpdir());
    assert.isTrue(error.name === "ProjectFolderExistError");
    assert.isTrue(
      error.message === `Path ${os.tmpdir()} already exists. Select a different folder.`
    );
  });

  it("error: WriteFileError", async () => {
    const msg = "file not exist";
    const error = WriteFileError(new Error(msg));
    assert.isTrue(error.name === "WriteFileError");
    assert.isTrue(error.message === msg);
  });

  it("error: ReadFileError", async () => {
    const msg = "file not exist";
    const error = ReadFileError(new Error(msg));
    assert.isTrue(error.name === "ReadFileError");
    assert.isTrue(error.message === msg);
  });

  it("error: NoneFxError", async () => {
    const msg = "hahahaha";
    const error = NoneFxError(new Error(msg));
    assert.isTrue(error.name === "NoneFxError");
    assert.isTrue(error.message === msg);
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

  it("isMultiEnvEnabled: return correct result based on environment variable value", () => {
    let restore = mockedEnv({
      [FeatureFlagName.MultiEnv]: undefined,
    });
    assert.isFalse(isMultiEnvEnabled());
    restore();

    restore = mockedEnv({
      [FeatureFlagName.MultiEnv]: "",
    });
    assert.isFalse(isMultiEnvEnabled());
    restore();

    restore = mockedEnv({
      [FeatureFlagName.MultiEnv]: "true",
    });
    assert.isTrue(isMultiEnvEnabled());
    restore();
  });

  it("SolutionPluginContainer", () => {
    const solutionPluginsV2 = getAllSolutionPluginsV2();
    assert.isTrue(solutionPluginsV2.map((s) => s.name).includes("fx-solution-azure"));
    assert.equal(
      getSolutionPluginV2ByName("fx-solution-azure"),
      Container.get(SolutionPluginsV2.AzureTeamsSolutionV2)
    );
    assert.equal(
      getSolutionPluginByName("fx-solution-azure"),
      Container.get(SolutionPlugins.AzureTeamsSolution)
    );
  });

  it("fileUtils", async () => {
    try {
      await readJson("abc");
    } catch (e) {
      assert.isTrue(e instanceof UserError);
    }
    sandbox.stub<any, any>(fs, "readJson").rejects(new Error("invalid json"));
    sandbox.stub<any, any>(fs, "pathExists").resolves(true);
    try {
      await readJson("abc");
    } catch (e) {
      assert.isTrue(e instanceof SystemError);
    }
  });

  it("ContextUpgradeError", async () => {
    const userError = ContextUpgradeError(new Error("11"), true);
    assert.isTrue(userError instanceof UserError);
    const sysError = ContextUpgradeError(new Error("11"), false);
    assert.isTrue(sysError instanceof SystemError);
  });

  it("parseTeamsAppTenantId", async () => {
    const res1 = parseTeamsAppTenantId({ tid: "123" });
    assert.isTrue(res1.isOk());
    const res2 = parseTeamsAppTenantId();
    assert.isTrue(res2.isErr());
    const res3 = parseTeamsAppTenantId({ abd: "123" });
    assert.isTrue(res3.isErr());
  });
});
