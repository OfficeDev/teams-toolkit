// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import { name, version } from "../../../src/packageMetadata";
import * as fs from "fs-extra";

describe("Package Meta Test - Node", () => {
  it("has same value with package.json", () => {
    const data = fs.readJSONSync("package.json");
    assert.strictEqual(name, data.name);
    assert.strictEqual(version, data.version);
  });
});
