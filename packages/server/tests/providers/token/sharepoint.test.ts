// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import { ServerSharepointTokenProvider } from "../../../src/providers/token/sharepoint";
import { createMessageConnection } from "vscode-jsonrpc";

chai.use(chaiAsPromised);

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

describe("sharepoint", () => {
  const sandbox = sinon.createSandbox();
  const msgConn = createMessageConnection(new TestStream() as any, new TestStream() as any);

  after(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const sp = new ServerSharepointTokenProvider(msgConn);
    chai.assert.equal(sp["connection"], msgConn);
  });

  it("getAccessToken", async () => {
    const sp = new ServerSharepointTokenProvider(msgConn);
    await chai.expect(sp.getAccessToken()).to.be.rejected;
  });

  it("getJsonObject", async () => {
    const sp = new ServerSharepointTokenProvider(msgConn);
    await chai.expect(sp.getJsonObject()).to.be.rejected;
  });

  it("setStatusChangeMap", async () => {
    const sp = new ServerSharepointTokenProvider(msgConn);
    await chai.expect(sp.setStatusChangeMap("test", sandbox.fake())).to.be.rejected;
  });

  it("removeStatusChangeMap", async () => {
    const sp = new ServerSharepointTokenProvider(msgConn);
    await chai.expect(sp.removeStatusChangeMap("test")).to.be.rejected;
  });
});
