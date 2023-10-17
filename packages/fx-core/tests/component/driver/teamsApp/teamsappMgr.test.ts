// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Platform, err, ok } from "@microsoft/teamsfx-api";
import chai from "chai";
import fs from "fs-extra";
import "mocha";
import * as sinon from "sinon";
import { teamsappMgr } from "../../../../src/component/driver/teamsApp/teamsappMgr";
import {
  FileNotFoundError,
  MissingRequiredInputError,
  UserCancelError,
} from "../../../../src/error";
import { envUtil } from "../../../../src/component/utils/envUtil";
import { pathUtils } from "../../../../src/component/utils/pathUtils";

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
    it("fail", async () => {
      const result = await teamsappMgr.readManifestFromAppPackage(
        "./tests/component/driver/teamsApp/fail.zip"
      );
      chai.assert(result.isErr());
    });
  });

  describe("checkAndTryToLoadEnv", async () => {
    it("no need to resolve", async () => {
      sandbox.stub(fs, "readFile").resolves("abc" as any);
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isOk() && result.value === undefined);
    });

    it("with env-file", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "loadEnvFile").resolves(ok({}));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
        "env-file": "xxx",
      });
      chai.assert(result.isOk() && result.value === undefined);
    });

    it("with env-file but load fail", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "loadEnvFile").resolves(err(new UserCancelError()));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
        "env-file": "xxx",
      });
      chai.assert(result.isErr() && result.error instanceof UserCancelError);
    });

    it("no env-file and list default envs fail", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(err(new UserCancelError()));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isErr() && result.error instanceof UserCancelError);
    });

    it("no env-file and get default env folder fail", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(err(new UserCancelError()));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isErr() && result.error instanceof UserCancelError);
    });

    it("no env-file and get default env folder returns undefined", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok(undefined));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isOk() && result.value === undefined);
    });

    it("has env input, success load target env file", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok("abc"));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
        env: "dev",
      });
      chai.assert(result.isOk() && result.value === "dev");
    });

    it("has env input, but not target env file not found", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok("abc"));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
        env: "dev2",
      });
      chai.assert(result.isErr() && result.error instanceof FileNotFoundError);
    });

    it("no env input, more than one env available", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "dev2"]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok("abc"));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isErr() && result.error instanceof MissingRequiredInputError);
    });

    it("no env input, only one env available, just use it", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok(["dev"]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok("abc"));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isOk() && result.value === "dev");
    });

    it("no env input, no env file found in default location, do nothing", async () => {
      sandbox.stub(fs, "readFile").resolves("${{APP_NAME}}" as any);
      sandbox.stub(envUtil, "listEnv").resolves(ok([]));
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok("abc"));
      const result = await teamsappMgr.checkAndTryToLoadEnv({
        projectPath: "xxx",
        platform: Platform.CLI,
        "manifest-file": "xxx",
      });
      chai.assert(result.isOk() && result.value === undefined);
    });
  });
});
