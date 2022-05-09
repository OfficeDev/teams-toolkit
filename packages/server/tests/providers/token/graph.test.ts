// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import ServerGraphTokenProvider from "../../../src/providers/token/graph";
import { createMessageConnection } from "vscode-jsonrpc";
import { err, ok } from "@microsoft/teamsfx-api";

chai.use(chaiAsPromised);

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

describe("graph", () => {
  const sandbox = sinon.createSandbox();
  const msgConn = createMessageConnection(new TestStream() as any, new TestStream() as any);

  after(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const graph = new ServerGraphTokenProvider(msgConn);
    chai.assert.equal(graph["connection"], msgConn);
  });

  describe("getAccessToken", () => {
    const graph = new ServerGraphTokenProvider(msgConn);

    it("getAccessToken: err", async () => {
      const promise = Promise.resolve(err(new Error("test")));
      const stub = sandbox.stub(msgConn, "sendRequest").returns(promise);
      await chai.expect(graph.getAccessToken()).to.be.rejected;
      stub.restore();
    });

    it("getAccessToken: ok", () => {
      const promise = Promise.resolve(ok("test"));
      const stub = sandbox.stub(msgConn, "sendRequest").returns(promise);
      const res = graph.getAccessToken();
      res.then((data) => {
        chai.expect(data).equal("test");
      });
      stub.restore();
    });
  });
  describe("getJsonObject", () => {
    const graph = new ServerGraphTokenProvider(msgConn);

    it("getJsonObject: err", async () => {
      const promise = Promise.resolve(err(new Error("test")));
      const stub = sandbox.stub(msgConn, "sendRequest").returns(promise);
      await chai.expect(graph.getJsonObject()).to.be.rejected;
      stub.restore();
    });

    it("getJsonObject: ok", () => {
      const promise = Promise.resolve(ok("test"));
      const stub = sandbox.stub(msgConn, "sendRequest").returns(promise);
      const res = graph.getJsonObject();
      res.then((data) => {
        chai.expect(data).equal("test");
      });
      stub.restore();
    });
  });

  it("signout", async () => {
    const graph = new ServerGraphTokenProvider(msgConn);
    await chai.expect(graph.signout()).to.be.rejected;
  });

  it("setStatusChangeMap", async () => {
    const graph = new ServerGraphTokenProvider(msgConn);
    await chai.expect(graph.setStatusChangeMap("test", sandbox.fake())).to.be.rejected;
  });

  it("removeStatusChangeMap", async () => {
    const graph = new ServerGraphTokenProvider(msgConn);
    await chai.expect(graph.removeStatusChangeMap("test")).to.be.rejected;
  });
});
