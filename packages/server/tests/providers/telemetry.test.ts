// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import ServerTelemetryReporter from "../../src/providers/telemetry";
import { Correlator } from "@microsoft/teamsfx-core";
import { NotificationTypes } from "../../src/apis";
import { createMessageConnection } from "vscode-jsonrpc";

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}
const correlationId = "testingid";

describe("telemetry", () => {
  const sandbox = sinon.createSandbox();
  const up = new TestStream();
  const down = new TestStream();
  const msgConn = createMessageConnection(up as any, down as any);
  sandbox.stub(Correlator, "getId").returns(correlationId);
  const telem = new ServerTelemetryReporter(msgConn);

  after(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    assert.equal(telem["connection"], msgConn);
  });

  it("sendTelemetryEvent", () => {
    const stub = sandbox.stub(msgConn, "sendNotification").callsFake((p1, p2, p3, p4, p5) => {
      expect(p1).equal(NotificationTypes.telemetry.sendTelemetryEvent);
      expect(p2).equal("testEvent");
      expect(p3).eql({ "correlation-id": correlationId });
      expect(p4).be.undefined;
      expect(p5).be.undefined;
    });
    telem.sendTelemetryEvent("testEvent");
    stub.restore();
  });

  it("sendTelemetryErrorEvent", () => {
    const stub = sandbox.stub(msgConn, "sendNotification").callsFake((p1, p2, p3, p4, p5) => {
      expect(p1).equal(NotificationTypes.telemetry.sendTelemetryErrorEvent);
      expect(p2).equal("testEvent");
      expect(p3).eql({ "correlation-id": correlationId });
      expect(p4).be.undefined;
      expect(p5).be.undefined;
    });
    telem.sendTelemetryErrorEvent("testEvent");
    stub.restore();
  });

  it("sendTelemetryException", () => {
    const e = new Error("test error");
    const stub = sandbox.stub(msgConn, "sendNotification").callsFake((p1, p2, p3, p4, p5) => {
      expect(p1).equal(NotificationTypes.telemetry.sendTelemetryException);
      expect(p2).equal(e);
      expect(p3).eql({ "correlation-id": correlationId });
      expect(p4).be.undefined;
      expect(p5).be.undefined;
    });
    telem.sendTelemetryException(e);
    stub.restore();
  });
});
