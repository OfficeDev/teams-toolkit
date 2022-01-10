// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import * as sinon from "sinon";
import {
  setLogger,
  internalLogger,
  setLogLevel,
  getLogLevel,
  LogLevel,
  Logger,
  setLogFunction,
  InternalLogger,
} from "../../src/util/logger";

describe("Logger Tests", () => {
  const errorStub: sinon.SinonStub<any[], void> = sinon.stub();
  const warnStub: sinon.SinonStub<any[], void> = sinon.stub();
  const infoStub: sinon.SinonStub<any[], void> = sinon.stub();
  const verboseStub: sinon.SinonStub<any[], void> = sinon.stub();
  const logger: Logger = {
    error: errorStub,
    warn: warnStub,
    info: infoStub,
    verbose: verboseStub,
  } as Logger;

  beforeEach(() => {
    internalLogger.level = undefined;
    setLogger(logger);
  });

  afterEach(() => {
    errorStub.reset();
    warnStub.reset();
    infoStub.reset();
    verboseStub.reset();
  });

  it("setLogLevel should success with Error level", () => {
    setLogLevel(LogLevel.Error);

    expect(getLogLevel()).to.equal(LogLevel.Error);
  });

  it("does not print log by default", () => {
    internalLogger.info("test");
    assert.isFalse(infoStub.called);
  });

  it("prints log after setting log level", () => {
    setLogLevel(LogLevel.Info);
    internalLogger.info("test");
    assert.isTrue(infoStub.called);
    internalLogger.verbose("test");
    assert.isFalse(verboseStub.called);
  });

  it("redirects log by log function", () => {
    setLogLevel(LogLevel.Info);
    let output = "";
    setLogFunction((level: LogLevel, message: string) => {
      if (level === LogLevel.Info) {
        output = message;
      }
    });
    internalLogger.info("test");
    assert.isTrue(output === "", "log function is inferior to logger");

    setLogger(undefined);
    internalLogger.info("test");
    assert.isTrue(output.endsWith("@microsoft/teamsfx : Info - test"), "log function is activated");
  });

  it("all log should be displayed when level is verbose", () => {
    setLogLevel(LogLevel.Verbose);

    internalLogger.error("test");
    assert.isTrue(errorStub.calledOnce);
    internalLogger.warn("test");
    assert.isTrue(warnStub.calledOnce);
    internalLogger.info("test");
    assert.isTrue(infoStub.calledOnce);
    internalLogger.verbose("test");
    assert.isTrue(verboseStub.calledOnce);
  });

  it("only error log should be printed when level is error", () => {
    setLogLevel(LogLevel.Error);

    internalLogger.error("test");
    assert.isTrue(errorStub.called);
    internalLogger.warn("test");
    assert.isFalse(warnStub.called);
    internalLogger.info("test");
    assert.isFalse(infoStub.called);
    internalLogger.verbose("test");
    assert.isFalse(verboseStub.called);
  });

  it("shows name when set in constructor", () => {
    const clock = sinon.useFakeTimers();
    const namedLogger = new InternalLogger("name");
    namedLogger.customLogger = logger;
    namedLogger.level = LogLevel.Info;

    namedLogger.info("test");
    assert.isTrue(infoStub.called);
    assert.isTrue(
      infoStub.calledWith(
        "[Thu, 01 Jan 1970 00:00:00 GMT] : @microsoft/teamsfx - name : Info - test"
      )
    );
    clock.restore();
  });
});
