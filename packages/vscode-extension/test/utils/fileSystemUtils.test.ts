import * as chai from "chai";
import * as sinon from "sinon";
import * as fileSystemUtils from "../../src/utils/fileSystemUtils";
import * as mockfs from "mock-fs";
import fs from "fs-extra";
import * as globalVariables from "../../src/globalVariables";
import { Uri } from "vscode";

describe("FileSystemUtils", () => {
  describe("anonymizeFilePaths()", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      mockfs.restore();
      sandbox.restore();
    });

    it("undefined", async () => {
      const result = await fileSystemUtils.anonymizeFilePaths();
      chai.assert.equal(result, "");
    });

    it("happy path 1", async () => {
      const result = await fileSystemUtils.anonymizeFilePaths(
        "at Object.require.extensions.<computed> [as .ts] (C:\\Users\\AppData\\Roaming\\npm\\node_modules\\ts-node\\src\\index.ts:1621:12)"
      );
      chai.assert.equal(
        result,
        "at Object.require.extensions.<computed> [as .ts] (<REDACTED: user-file-path>/index.ts:1621:12)"
      );
    });
    it("happy path 2", async () => {
      const result = await fileSystemUtils.anonymizeFilePaths(
        "at Object.require.extensions.<computed> [as .ts] (/user/test/index.ts:1621:12)"
      );
      chai.assert.equal(
        result,
        "at Object.require.extensions.<computed> [as .ts] (<REDACTED: user-file-path>/index.ts:1621:12)"
      );
    });
    it("happy path 3", async () => {
      const result = await fileSystemUtils.anonymizeFilePaths(
        "some user stack trace at (C:/fake_path/fake_file:1:1)"
      );
      chai.assert.equal(
        result,
        "some user stack trace at (<REDACTED: user-file-path>/fake_file:1:1)"
      );
    });
  });

  describe("getProvisionResultJson", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("returns undefined if no workspace Uri", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(undefined);
      const result = await fileSystemUtils.getProvisionResultJson("test");
      chai.expect(result).equals(undefined);
    });

    it("returns undefined if is not TeamsFx project", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
      const result = await fileSystemUtils.getProvisionResultJson("test");
      chai.expect(result).deep.equals(undefined);
    });

    it("returns undefined if provision output file does not exists", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "existsSync").returns(false);

      const result = await fileSystemUtils.getProvisionResultJson("test");
      chai.expect(result).equals(undefined);
    });

    it("returns provision output file result", async () => {
      const expectedResult = { test: "test" };
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readJSON").resolves(expectedResult);

      const result = await fileSystemUtils.getProvisionResultJson("test");
      chai.expect(result).equals(expectedResult);
    });
  });
});
