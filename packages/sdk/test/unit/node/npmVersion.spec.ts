// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { name, version } from "../../../src/packageMetadata";
import * as fs from "fs-extra";

describe("Package Meta Test - Node", () => {
  it("has same value with package.json", () => {
    const packageData = fs.readJSONSync("package.json");
    assert.strictEqual(name, packageData.name);
    assert.isTrue(packageData.version.startsWith(version));
    if (fs.existsSync("package-lock.json")) {
      const packageLockData = fs.readJSONSync("package-lock.json");
      assert.strictEqual(name, packageLockData.name);
      assert.isTrue(packageLockData.version.startsWith(version));
    }
  });
});
