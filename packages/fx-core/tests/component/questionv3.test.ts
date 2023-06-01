// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import {
  getQuestionsForAddWebpart,
  getQuestionsForCreateAppPackage,
  getQuestionsForUpdateTeamsApp,
  getQuestionsForValidateAppPackage,
  getQuestionsForValidateManifest,
  spfxFolderQuestion,
} from "../../src/component/question";
describe("question for v3", () => {
  let mockedEnvRestore: RestoreFn;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_V3: "false" });
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });
  it("getQuestionsForAddWebpart", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: "./test",
    };

    const res = getQuestionsForAddWebpart(inputs);

    assert.isTrue(res.isOk());
  });

  it("spfxFolderQuestion", () => {
    const projectDir = "\\test";

    const res = (spfxFolderQuestion() as any).default({ projectPath: projectDir });

    assert.equal(res, "\\test/src");
  });

  it("validate manifest question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      validateMethod: "validateAgainstSchema",
    };
    const nodeRes = await getQuestionsForValidateManifest(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("validate app package question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      validateMethod: "validateAgainstAppPackage",
    };
    const nodeRes = await getQuestionsForValidateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question - cli help", async () => {
    const inputs: Inputs = {
      platform: Platform.CLI_HELP,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("create app package question - vs", async () => {
    const inputs: Inputs = {
      platform: Platform.VS,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForCreateAppPackage(inputs);
    assert.isTrue(nodeRes.isOk());
  });

  it("update Teams app question", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const nodeRes = await getQuestionsForUpdateTeamsApp(inputs);
    assert.isTrue(nodeRes.isOk());
  });
});
