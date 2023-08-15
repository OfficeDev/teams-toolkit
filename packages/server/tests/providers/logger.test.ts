// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Colors, LogLevel } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import sinon from "sinon";
import { Duplex } from "stream";
import { createMessageConnection } from "vscode-jsonrpc";
import ServerLogProvider from "../../src/providers/logger";

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

describe("ServerLogProvider", () => {
  const sandbox = sinon.createSandbox();
  const up = new TestStream();
  const down = new TestStream();
  const msgConn = createMessageConnection(up as any, down as any);

  after(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const logger = new ServerLogProvider(msgConn);
    assert.equal(logger["connection"], msgConn);
  });

  it("log", () => {
    const stub = sandbox.stub(msgConn, "sendNotification");
    const logger = new ServerLogProvider(msgConn);
    logger.log(LogLevel.Debug, "test");
    assert.isTrue(stub.called);
  });

  it("write to file", async () => {
    const logger = new ServerLogProvider(msgConn);
    sandbox.stub(fs, "pathExists").resolves(false);
    sandbox.stub(fs, "mkdir");
    const stub = sandbox.stub(fs, "appendFile");
    await logger.logInFile(LogLevel.Info, "test");
    assert.isTrue(stub.called);
  });

  describe("methods", () => {
    const logger = new ServerLogProvider(msgConn);
    let stub: any;

    beforeEach(() => {
      stub = sandbox.stub(logger, "log");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("verbose", () => {
      logger.verbose("test");
      assert.isTrue(stub.calledWith(LogLevel.Verbose, "test"));
    });

    it("debug", () => {
      logger.debug("test");
      assert.isTrue(stub.calledWith(LogLevel.Debug, "test"));
    });

    it("info", () => {
      logger.info("test");
      logger.info([{ content: "test", color: Colors.BRIGHT_CYAN }]);
      assert.isTrue(stub.calledTwice);
    });

    it("warning", () => {
      logger.warning("test");
      assert.isTrue(stub.calledWith(LogLevel.Warning, "test"));
    });

    it("error", () => {
      logger.error("test");
      assert.isTrue(stub.calledWith(LogLevel.Error, "test"));
    });
    it("getLogFilePath", () => {
      const logFolderPath = logger.getLogFilePath();
      assert.isTrue(logFolderPath !== "");
    });
  });
});
