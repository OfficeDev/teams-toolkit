// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogLevel } from "@microsoft/teamsfx-api";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { CLILogProvider } from "../../../src/commonlib/log";
import ScreenManager from "../../../src/console/screen";
import { CLILogLevel } from "../../../src/constants";

describe("CLILogProvider", () => {
  const logger = new CLILogProvider();
  logger.setLogLevel(CLILogLevel.debug);
  const sandox = sinon.createSandbox();
  let message = "";

  beforeEach(() => {
    sandox.stub(ScreenManager, "writeLine").callsFake((msg: string) => (message += msg));
  });

  afterEach(() => {
    sandox.restore();
    message = "";
  });

  it("Log - verbose", async () => {
    await logger.verbose("verbose");
    expect(message).to.contain("verbose");
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

  it("OutputSuccess", async () => {
    logger.outputSuccess("success");
    expect(message).to.contain("success");
  });

  it("NecessaryLog - Verbose", async () => {
    logger.necessaryLog(LogLevel.Verbose, "trace");
    expect(message).to.contain("trace");
  });

  it("NecessaryLog - Debug", async () => {
    logger.necessaryLog(LogLevel.Debug, "debug");
    expect(message).to.contain("debug");
  });

  it("NecessaryLog - Info", async () => {
    logger.necessaryLog(LogLevel.Info, "info");
    expect(message).to.contain("info");
  });

  it("NecessaryLog - Info - White", async () => {
    logger.necessaryLog(LogLevel.Info, "info", true);
    expect(message).to.contain("info");
  });

  it("NecessaryLog - Warning", async () => {
    logger.necessaryLog(LogLevel.Warning, "warning");
    expect(message).to.contain("warning");
  });

  it("NecessaryLog - Error", async () => {
    logger.necessaryLog(LogLevel.Error, "error");
    expect(message).to.contain("error");
  });
});
