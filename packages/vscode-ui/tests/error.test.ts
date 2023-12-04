// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import {
  EmptyOptionsError,
  InternalUIError,
  ScriptTimeoutError,
  UnhandledError,
  UnsupportedQuestionTypeError,
  UserCancelError,
  assembleError,
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

  it("UnhandledError", async () => {
    const error = new UnhandledError("a", "a", "b");
    assert.equal(error.name, "UnhandledError");
    assert.equal(error.message, "a");
    assert.equal(error.displayMessage, "b");
  });
  it("UnsupportedQuestionTypeError", async () => {
    const error = new UnsupportedQuestionTypeError("a", "b");
    assert.equal(error.name, "UnsupportedQuestionTypeError");
    assert.equal(error.message, "a");
    assert.equal(error.displayMessage, "b");
  });
  it("assembleError", async () => {
    const error = assembleError("a", "b", "c") as any;
    assert.equal(error.name, "UnhandledError");
    assert.equal(error.message, "b");
    assert.equal(error.displayMessage, "c");
  });
});
