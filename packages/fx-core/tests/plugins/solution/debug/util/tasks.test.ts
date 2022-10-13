// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { generateSpfxTasks } from "../../../../../src/component/debug/util/tasks";

describe("tasks", () => {
  it("generateSpfxTasks", () => {
    const spfxTasks = generateSpfxTasks();
    for (const block of spfxTasks) {
      if (block.dependsOrder) {
        chai.assert.equal(block.dependsOrder, "sequence");
      }
    }
  });
});
