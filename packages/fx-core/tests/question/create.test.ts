// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import {
  CapabilityOptions,
  ProjectTypeOptions,
  QuestionNames,
  createProjectQuestion,
  getLanguageOptions,
} from "../../src/question/create";
import { Platform } from "@microsoft/teamsfx-api";
describe("scaffold question", () => {
  const sandbox = sinon.createSandbox();
  // let mockedEnvRestore: RestoreFn = () => {};
  beforeEach(() => {
    // mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "true" });
  });
  afterEach(() => {
    sandbox.restore();
    // mockedEnvRestore();
  });
  describe("createProjectQuestion", () => {
    it("happy path", async () => {
      const root = createProjectQuestion();
      assert.isDefined(root);
    });
  });

  describe("getLanguageOptions", () => {
    it("dotnet", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        runtime: "dotnet",
      });
      assert.isTrue(options.length === 1 && options[0].id === "csharp");
    });
    it("office addin", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
        [QuestionNames.Capabilities]: "taskpane",
      });
      assert.isTrue(options.length === 1 && options[0].id === "TypeScript");
    });
    it("SPFx", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.SPFxTab().id,
      });
      assert.isTrue(options.length === 1 && options[0].id === "typescript");
    });
    it("other", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
      });
      assert.isTrue(options.length === 2);
    });
  });
});
