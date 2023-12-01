// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";

describe("test", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(async () => {
    sandbox.restore();
  });

  it("test", async () => {
    assert.isTrue(true);
  });
});
