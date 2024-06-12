import * as chai from "chai";
import * as sinon from "sinon";
import * as fileSystemUtils from "../../../src/utils/fileSystemUtils";
import * as mockfs from "mock-fs";

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
});
