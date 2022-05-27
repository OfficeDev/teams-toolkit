// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import { createMessageConnection } from "vscode-jsonrpc";
import { Namespaces, NotificationTypes } from "../../src/apis";
import ServerLogProvider from "../../src/providers/logger";
import { Colors, LogLevel } from "@microsoft/teamsfx-api";

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
    const res = logger.log(0, "test");
    res.then((data) => {
      assert.isTrue(data);
      expect(stub).is.called.with(NotificationTypes[Namespaces.Logger].show, 0, "test");
    });
  });

  describe("methods", () => {
    const logger = new ServerLogProvider(msgConn);
    const stub = sandbox.stub(logger, "log");

    it("trace", () => {
      const res = logger.trace("test");
      res.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Trace, "test");
      });
    });

    it("debug", () => {
      const res = logger.debug("test");
      res.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Debug, "test");
      });
    });

    it("info", () => {
      const res = logger.info("test");
      res.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Info, "test");
      });

      const res1 = logger.info([{ content: "test", color: Colors.BRIGHT_CYAN }] as any);
      res1.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Info, "test");
      });
    });

    it("warning", () => {
      const res = logger.warning("test");
      res.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Warning, "test");
      });
    });

    it("error", () => {
      const res = logger.error("test");
      res.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Error, "test");
      });
    });

    it("fatal", () => {
      const res = logger.fatal("test");
      res.then((data) => {
        assert.isTrue(data);
        expect(stub).is.called.with(LogLevel.Fatal, "test");
      });
    });
  });
});
