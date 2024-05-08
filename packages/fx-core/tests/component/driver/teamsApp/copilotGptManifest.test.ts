// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import { DeclarativeCopilotManifestSchema } from "@microsoft/teamsfx-api";
import { copilotGptManifestUtils } from "../../../../src/component/driver/teamsApp/utils/CopilotGptManifestUtils";
import { FileNotFoundError, WriteFileError } from "../../../../src/error";

describe("copilotGptManifestUtils", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  const gptManifest: DeclarativeCopilotManifestSchema = {
    name: "name",
    description: "description",
  };

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
