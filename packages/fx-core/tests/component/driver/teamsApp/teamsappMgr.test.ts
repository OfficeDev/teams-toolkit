// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, err, ok } from "@microsoft/teamsfx-api";
import chai from "chai";
import fs from "fs-extra";
import "mocha";
import * as sinon from "sinon";
import { teamsappMgr } from "../../../../src/component/driver/teamsApp/teamsappMgr";
import { FileNotFoundError, UserCancelError } from "../../../../src/error";

describe("TeamsAppMgr", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  describe("ensureAppPackageFile", async () => {
    it("sucess", async () => {
      sandbox
        .stub(teamsappMgr, "packageTeamsApp")
        .resolves(ok({ manifestPath: "", outputJsonPath: "", outputZipPath: "" }));
      sandbox.stub(fs, "pathExists").resolves(true);
      const result = await teamsappMgr.ensureAppPackageFile({
        projectPath: "",
        platform: Platform.CLI,
      });
      chai.assert(result.isOk());
    });
    it("file not found", async () => {
      sandbox
        .stub(teamsappMgr, "packageTeamsApp")
        .resolves(ok({ manifestPath: "", outputJsonPath: "", outputZipPath: "" }));
      sandbox.stub(fs, "pathExists").resolves(false);
      const result = await teamsappMgr.ensureAppPackageFile({
        projectPath: "",
        platform: Platform.CLI,
      });
      chai.assert(result.isErr() && result.error instanceof FileNotFoundError);
    });
    it("packageTeamsApp returns error", async () => {
      sandbox.stub(teamsappMgr, "packageTeamsApp").resolves(err(new UserCancelError()));
      const result = await teamsappMgr.ensureAppPackageFile({
        projectPath: "",
        platform: Platform.CLI,
      });
      chai.assert(result.isErr() && result.error instanceof UserCancelError);
    });
  });

  describe("readManifestFromAppPackage", async () => {
    it("sucess", async () => {
      const result = await teamsappMgr.readManifestFromAppPackage(
        "./tests/component/driver/teamsApp/success.zip"
      );
      chai.assert(result.isOk());
    });
    it("sucess", async () => {
      const result = await teamsappMgr.readManifestFromAppPackage(
        "./tests/component/driver/teamsApp/fail.zip"
      );
      chai.assert(result.isErr());
    });
  });
});
