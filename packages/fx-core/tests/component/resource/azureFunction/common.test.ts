// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as fs from "fs-extra";
import * as path from "path";
import { zipFolderAsync } from "../../../../src/component/resource/azureAppService/common";
import { assert } from "chai";

const root = path.join(__dirname, "ut");

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
});
