// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import {
  DeclarativeCopilotManifestSchema,
  ManifestUtil,
  Platform,
  SystemError,
  ok,
  err,
  Colors,
} from "@microsoft/teamsfx-api";
import { copilotGptManifestUtils } from "../../../../src/component/driver/teamsApp/utils/CopilotGptManifestUtils";
import {
  FileNotFoundError,
  MissingEnvironmentVariablesError,
  WriteFileError,
} from "../../../../src/error";
import mockedEnv, { RestoreFn } from "mocked-env";
import { pluginManifestUtils } from "../../../../src/component/driver/teamsApp/utils/PluginManifestUtils";
import { AppStudioError } from "../../../../src/component/driver/teamsApp/errors";
import { DeclarativeCopilotManifestValidationResult } from "../../../../src/component/driver/teamsApp/interfaces/ValidationResult";

describe("copilotGptManifestUtils", () => {
  const sandbox = sinon.createSandbox();
  let mockedEnvRestore: RestoreFn;

  afterEach(async () => {
    sandbox.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  const gptManifest: DeclarativeCopilotManifestSchema = {
    name: "name${{APP_NAME_SUFFIX}}",
    description: "description",
  };

  describe("add plugin", async () => {
    it("add plugin success", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(gptManifest) as any);
      sandbox.stub(fs, "writeFile").resolves();

      const res = await copilotGptManifestUtils.addAction("testPath", "testId", "testFile");

      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        const updatedManifest = res.value;
        chai.assert.deepEqual(updatedManifest.actions![0], {
          id: "testId",
          file: "testFile",
        });
      }
    });

    it("add plugin error: read manifest error", async () => {
      sandbox.stub(fs, "pathExists").resolves(false);
      const res = await copilotGptManifestUtils.addAction("testPath", "testId", "testFile");
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof FileNotFoundError);
      }
    });

    it("add plugin error: write file error", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(gptManifest) as any);
      sandbox.stub(fs, "writeFile").throws("some error");
      const res = await copilotGptManifestUtils.addAction("testPath", "testId", "testFile");
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof WriteFileError);
      }
    });
  });

  describe("getManifest", async () => {
    it("get manifest success", async () => {
      mockedEnvRestore = mockedEnv({
        ["APP_NAME_SUFFIX"]: "test",
      });
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(gptManifest) as any);

      const res = await copilotGptManifestUtils.getManifest("testPath");

      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.equal("nametest", res.value.name);
      }
    });

    it("get manifest error: file not found", async () => {
      sandbox.stub(fs, "pathExists").resolves(false);
      const res = await copilotGptManifestUtils.getManifest("testPath");
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof FileNotFoundError);
      }
    });

    it("get manifest error: unresolved env error", async () => {
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(gptManifest) as any);

      const res = await copilotGptManifestUtils.getManifest("testPath");

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof MissingEnvironmentVariablesError);
      }
    });
  });

  describe("validateAgainstSchema", async () => {
    it("validate success", async () => {
      const manifest: DeclarativeCopilotManifestSchema = {
        ...gptManifest,
        actions: [
          {
            id: "1",
            file: "testFile",
          },
        ],
      };
      mockedEnvRestore = mockedEnv({
        ["APP_NAME_SUFFIX"]: "test",
      });
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(manifest) as any);
      sandbox.stub(ManifestUtil, "validateManifest").resolves([]);
      sandbox.stub(pluginManifestUtils, "validateAgainstSchema").resolves(
        ok({
          id: "1",
          filePath: "testFile",
          validationResult: ["error1"],
        })
      );

      const res = await copilotGptManifestUtils.validateAgainstSchema(
        { id: "1", file: "file" },
        "testPath"
      );
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.deepEqual(res.value, {
          id: "1",
          filePath: "testPath",
          validationResult: [],
          actionValidationResult: [
            {
              id: "1",
              filePath: "testFile",
              validationResult: ["error1"],
            },
          ],
        });
      }
    });

    it("validate action error", async () => {
      const manifest: DeclarativeCopilotManifestSchema = {
        ...gptManifest,
        actions: [
          {
            id: "1",
            file: "testFile",
          },
        ],
      };
      mockedEnvRestore = mockedEnv({
        ["APP_NAME_SUFFIX"]: "test",
      });
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(manifest) as any);
      sandbox.stub(ManifestUtil, "validateManifest").resolves([]);
      sandbox
        .stub(pluginManifestUtils, "validateAgainstSchema")
        .resolves(err(new SystemError("error", "error", "error", "error")));

      const res = await copilotGptManifestUtils.validateAgainstSchema(
        { id: "1", file: "file" },
        "testPath"
      );
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal("error", res.error.name);
      }
    });

    it("validate schema error", async () => {
      const manifest: DeclarativeCopilotManifestSchema = {
        ...gptManifest,
        actions: [
          {
            id: "1",
            file: "testFile",
          },
        ],
      };
      mockedEnvRestore = mockedEnv({
        ["APP_NAME_SUFFIX"]: "test",
      });
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readFile").resolves(JSON.stringify(gptManifest) as any);
      sandbox.stub(ManifestUtil, "validateManifest").throws("error");

      const res = await copilotGptManifestUtils.validateAgainstSchema(
        { id: "1", file: "file" },
        "testPath"
      );
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(AppStudioError.ValidationFailedError.name, res.error.name);
      }
    });

    it("error: cannot get manifest", async () => {
      sandbox.stub(fs, "pathExists").resolves(false);

      const res = await copilotGptManifestUtils.validateAgainstSchema(
        { id: "1", file: "file" },
        "testPath"
      );
      chai.assert.isTrue(res.isErr());
    });
  });

  describe("logValidationErrors", () => {
    it("skip if no errors", () => {
      const validationRes: DeclarativeCopilotManifestValidationResult = {
        id: "1",
        filePath: "testPath",
        validationResult: [],
        actionValidationResult: [
          {
            id: "1",
            filePath: "testPath",
            validationResult: [],
          },
          {
            id: "2",
            filePath: "pluginPath",
            validationResult: [],
          },
        ],
      };

      const res = copilotGptManifestUtils.logValidationErrors(validationRes, Platform.VSCode, "");
      chai.assert.isEmpty(res);
    });

    it("log if VSC", () => {
      const validationRes: DeclarativeCopilotManifestValidationResult = {
        id: "1",
        filePath: "testPath",
        validationResult: ["error1"],
        actionValidationResult: [
          {
            id: "1",
            filePath: "testPath",
            validationResult: ["errorAction1"],
          },
          {
            id: "2",
            filePath: "pluginPath",
            validationResult: ["errorAction2"],
          },
        ],
      };

      const res = copilotGptManifestUtils.logValidationErrors(
        validationRes,
        Platform.VSCode,
        "pluginPath"
      ) as string;

      chai.assert.isFalse(res.includes("errorActions2"));
      chai.assert.isTrue(res.includes("error1"));
      chai.assert.isTrue(res.includes("errorAction1"));
    });

    it("log if VSC and action error only", () => {
      const validationRes: DeclarativeCopilotManifestValidationResult = {
        id: "1",
        filePath: "testPath",
        validationResult: [],
        actionValidationResult: [
          {
            id: "1",
            filePath: "testPath",
            validationResult: ["errorAction1"],
          },
          {
            id: "2",
            filePath: "pluginPath",
            validationResult: ["errorAction2"],
          },
        ],
      };

      const res = copilotGptManifestUtils.logValidationErrors(
        validationRes,
        Platform.VSCode,
        "pluginPath"
      ) as string;

      chai.assert.isFalse(res.includes("errorActions2"));
      chai.assert.isTrue(res.includes("errorAction1"));
    });

    it("log if CLI", () => {
      const validationRes: DeclarativeCopilotManifestValidationResult = {
        id: "1",
        filePath: "testPath",
        validationResult: ["error1"],
        actionValidationResult: [
          {
            id: "1",
            filePath: "testPath",
            validationResult: ["errorAction1"],
          },
          {
            id: "2",
            filePath: "pluginPath",
            validationResult: ["errorAction2"],
          },
        ],
      };

      const res = copilotGptManifestUtils.logValidationErrors(
        validationRes,
        Platform.CLI,
        "pluginPath"
      ) as Array<{ content: string; color: Colors }>;
      chai.assert.isTrue(res.find((item) => item.content.includes("error1")) !== undefined);
      chai.assert.isTrue(res.find((item) => item.content.includes("errorAction1")) !== undefined);
      chai.assert.isUndefined(res.find((item) => item.content.includes("errorAction2")));
    });

    it("log if CLI and action error only", () => {
      const validationRes: DeclarativeCopilotManifestValidationResult = {
        id: "1",
        filePath: "testPath",
        validationResult: [],
        actionValidationResult: [
          {
            id: "1",
            filePath: "testPath",
            validationResult: ["errorAction1"],
          },
          {
            id: "2",
            filePath: "pluginPath",
            validationResult: ["errorAction2"],
          },
        ],
      };

      const res = copilotGptManifestUtils.logValidationErrors(
        validationRes,
        Platform.CLI,
        ""
      ) as Array<{ content: string; color: Colors }>;
      chai.assert.isTrue(res.find((item) => item.content.includes("errorAction2")) !== undefined);
      chai.assert.isTrue(res.find((item) => item.content.includes("errorAction1")) !== undefined);
    });
  });
});
