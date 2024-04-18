// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author huajiezhang@microsoft.com
 */

import * as chai from "chai";
import fse from "fs-extra";
import "mocha";
import * as sinon from "sinon";
import * as generatorUtils from "../../../src/component/generator/utils";

describe("Generator Utils", function () {
  describe("fetchAndUnzip", async () => {
    const sandbox = sinon.createSandbox();
    class ZipEntry {
      isDirectory: boolean;
      entryName: string;
      getData() {
        return Buffer.from("test");
      }
      constructor(isDir: boolean, entryName: string) {
        this.isDirectory = isDir;
        this.entryName = entryName;
      }
    }

    class MockAdmZip {
      getEntries() {
        return [new ZipEntry(true, "dir"), new ZipEntry(false, "dir/file")];
      }
    }

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(generatorUtils, "fetchZipFromUrl").resolves(new MockAdmZip() as any);
      sandbox.stub(fse, "ensureDir").resolves();
      sandbox.stub(fse, "writeFile").resolves();
      const res = await generatorUtils.fetchAndUnzip("test", "url", "dest");
      chai.assert.isTrue(res.isOk());
    });

    // it("fail case: ", async () => {});
  });
});
