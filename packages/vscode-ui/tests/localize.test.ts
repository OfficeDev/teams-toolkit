// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import { DefaultLocalizer } from "../src/localize";

describe("DefaultLocalizer", () => {
  const localizer = new DefaultLocalizer();
  it("browse", async () => {
    assert.equal(localizer.browse(), "Browse...");
  });
  it("cancelErrorDisplayMessage", async () => {
    assert.equal(localizer.cancelErrorDisplayMessage(), "User canceled.");
  });
  it("cancelErrorMessage", async () => {
    assert.equal(localizer.cancelErrorMessage(), "User canceled.");
  });
  it("commandTimeoutErrorDisplayMessage", async () => {
    assert.equal(
      localizer.commandTimeoutErrorDisplayMessage("abc"),
      "Execute command timeout: abc"
    );
  });
  it("commandTimeoutErrorMessage", async () => {
    assert.equal(localizer.commandTimeoutErrorMessage("abc"), "Execute command timeout: abc");
  });
  it("defaultFolder", async () => {
    assert.equal(localizer.defaultFolder(), "Default folder");
  });
  it("emptyOptionErrorDisplayMessage", async () => {
    assert.equal(localizer.emptyOptionErrorDisplayMessage(), "Empty options.");
  });
  it("emptyOptionErrorMessage", async () => {
    assert.equal(localizer.emptyOptionErrorMessage(), "Empty options.");
  });
  it("internalErrorDisplayMessage", async () => {
    assert.equal(localizer.internalErrorDisplayMessage("abc"), "VS Code failed to operate: abc");
  });
  it("internalErrorDisplayMessage", async () => {
    assert.equal(localizer.internalErrorMessage("abc"), "VS Code failed to operate: abc");
  });
  it("loadingDefaultPlaceholder", async () => {
    assert.equal(localizer.loadingDefaultPlaceholder(), "Loading default value...");
  });
  it("loadingOptionsPlaceholder", async () => {
    assert.equal(localizer.loadingOptionsPlaceholder(), "Loading options...");
  });
  it("loadingOptionsTimeoutMessage", async () => {
    assert.equal(localizer.loadingOptionsTimeoutMessage(), "Loading options timeout.");
  });
  it("multiSelectKeyboardPlaceholder", async () => {
    assert.equal(localizer.multiSelectKeyboardPlaceholder(), " (Space key to check/uncheck)");
  });
});
