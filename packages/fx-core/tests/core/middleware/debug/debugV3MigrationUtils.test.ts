// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";

import { generateLabel } from "../../../../src/core/middleware/utils/debug/debugV3MigrationUtils";

describe("debugV3MigrationUtils", () => {
  describe("generateLabel", () => {
    it("no plus", () => {
      const labels = ["label", "label 1", "label 2", "label 3"];
      const base = "base";
      const result = generateLabel(base, labels);
      chai.assert.equal(result, base);
    });

    it("plus 3", () => {
      const labels = ["label", "label 1", "label 2", "label 3"];
      const base = "label";
      const result = generateLabel(base, labels);
      chai.assert.equal(result, "label 4");
    });
  });
});
