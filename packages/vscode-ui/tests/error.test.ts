// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import {
  EmptyOptionsError,
  InternalUIError,
  ScriptTimeoutError,
  UserCancelError,
} from "../src/error";

describe("Error", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(async () => {
    sandbox.restore();
  });

  it("UserCancelError", async () => {
    const error = new UserCancelError("a", "b");
    assert.equal(error.name, "UserCancelError");
    assert.equal(error.message, "a");
    assert.equal(error.displayMessage, "b");
  });

  it("EmptyOptionsError", async () => {
    const error = new EmptyOptionsError("a", "b");
    assert.equal(error.name, "EmptyOptionsError");
    assert.equal(error.message, "a");
    assert.equal(error.displayMessage, "b");
  });

  it("InternalUIError", async () => {
    const error = new InternalUIError("a", "b");
    assert.equal(error.name, "InternalUIError");
    assert.equal(error.message, "a");
    assert.equal(error.displayMessage, "b");
  });

  it("ScriptTimeoutError", async () => {
    const error = new ScriptTimeoutError("a", "b");
    assert.equal(error.name, "ScriptTimeoutError");
    assert.equal(error.message, "a");
    assert.equal(error.displayMessage, "b");
  });
});
