// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { zipFolderAsync } from "../../../../src/component/resource/azureAppService/common";
import { zipFolderAsync as zipFolderAsync2 } from "../../../../src/component/utils/fileOperation";
import { assert } from "chai";
import { randomAppName } from "../../../core/utils";
import ignore, { Ignore } from "ignore";
import { DeployEmptyFolderError } from "../../../../src/error/deploy";
const root = path.join(os.tmpdir(), randomAppName());

describe("App service common utils", async () => {
  after(() => {
    fs.emptyDirSync(root);
    fs.rmdirSync(root);
  });
  it("zip folder", async () => {
    // Arrange
    await fs.ensureDir(root);
    await fs.writeFile(path.join(root, "ut-file"), "ut-file");

    await zipFolderAsync(root, "");
  });
  it("update file in zip", async () => {
    // Arrange
    await fs.ensureDir(root);
    await fs.writeFile(path.join(root, "ut-file"), "ut-file");

    const zip = await zipFolderAsync(root, "");
    await fs.writeFile(path.join(root, "zip"), zip);
    const zip2 = await zipFolderAsync(root, path.join(root, "zip"));
    assert.exists(zip2);
  });
  it("DeployEmptyFolderError", async () => {
    // Arrange
    const root = path.join(os.tmpdir(), randomAppName());
    await fs.ensureDir(root);
    try {
      await zipFolderAsync2(root, "", ignore());
      assert.fail("should not reach here");
    } catch (e) {
      assert.isTrue(e instanceof DeployEmptyFolderError);
    }
  });
});
