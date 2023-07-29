// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel } from "@microsoft/teamsfx-api";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import ScreenManager from "../../../src/console/screen";
import { logger } from "../../../src/commonlib/logger";

describe("CLILogger", () => {
  logger.logLevel = LogLevel.Trace;
  const sandox = sinon.createSandbox();
  let message = "";

  beforeEach(() => {
    sandox.stub(ScreenManager, "writeLine").callsFake((msg: string) => (message += msg));
  });

  afterEach(() => {
    sandox.restore();
    message = "";
  });

  it("Log - Trace", async () => {
    await logger.trace("trace");
    expect(message).to.contain("trace");
  });

  it("Log - Debug", async () => {
    await logger.debug("debug");
    expect(message).to.contain("debug");
  });

  it("Log - Info", async () => {
    await logger.debug("info");
    expect(message).to.contain("info");
  });

  it("Log - Warning", async () => {
    await logger.debug("warning");
    expect(message).to.contain("warning");
  });

  it("Log - Error", async () => {
    await logger.debug("error");
    expect(message).to.contain("error");
  });

  it("Log - Fatal", async () => {
    await logger.debug("fatal");
    expect(message).to.contain("fatal");
  });

  it("OutputSuccess", async () => {
    logger.outputSuccess("success");
    expect(message).to.contain("success");
  });
});
