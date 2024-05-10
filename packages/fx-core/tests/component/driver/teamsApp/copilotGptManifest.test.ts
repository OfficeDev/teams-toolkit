// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import { DeclarativeCopilotManifestSchema } from "@microsoft/teamsfx-api";
import { copilotGptManifestUtils } from "../../../../src/component/driver/teamsApp/utils/CopilotGptManifestUtils";
import {
  FileNotFoundError,
  MissingEnvironmentVariablesError,
  WriteFileError,
} from "../../../../src/error";
import mockedEnv, { RestoreFn } from "mocked-env";

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
});
