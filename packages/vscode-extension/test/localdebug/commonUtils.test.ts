// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import * as commonUtils from "../../src/debug/commonUtils";

const testDataFolder = path.resolve(__dirname, "test-data");

describe("[debug > commonUtils]", () => {
  beforeEach(async () => {
    await fs.ensureDir(testDataFolder);
    await fs.emptyDir(testDataFolder);
  });
});
