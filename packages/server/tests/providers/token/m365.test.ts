// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import { createMessageConnection } from "vscode-jsonrpc";
import ServerM365TokenProvider from "../../../src/providers/token/m365";
import { err, ok } from "@microsoft/teamsfx-api";
import { NotImplementedError } from "@microsoft/teamsfx-core";

chai.use(chaiAsPromised);

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

describe("m365", () => {
  const sandbox = sinon.createSandbox();
  const up = new TestStream();
  const down = new TestStream();
  const msgConn = createMessageConnection(up as any, down as any);

  after(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const appStudio = new ServerM365TokenProvider(msgConn);
    chai.assert.equal(appStudio["connection"], msgConn);
  });

  describe("method", () => {
    const appStudio = new ServerM365TokenProvider(msgConn);

    it("getAccessToken: ok", () => {
      const promise = Promise.resolve(ok("test"));
      const stub = sandbox.stub(msgConn, "sendRequest").callsFake(() => {
        return promise;
      });
      const res = appStudio.getAccessToken({ scopes: ["test"] });
      res.then((data) => {
        chai.expect(data).equal("test");
      });
      stub.restore();
    });

    it("getAccessToken: err", async () => {
      const e = new Error("test");
      const promise = Promise.resolve(err(e));
      const stub = sandbox.stub(msgConn, "sendRequest").callsFake(() => {
        return promise;
      });
      const res = await appStudio.getAccessToken({ scopes: ["test"] });
      await chai.expect(res.isErr()).equal(true);
      stub.restore();
    });

    it("getJsonObject: ok", () => {
      const promise = Promise.resolve(ok("test"));
      const stub = sandbox.stub(msgConn, "sendRequest").callsFake(() => {
        return promise;
      });
      const res = appStudio.getJsonObject({ scopes: ["test"] });
      res.then((data) => {
        chai.expect(data).equal("test");
      });
      stub.restore();
    });

    it("getJsonObject: err", async () => {
      const e = new Error("test");
      const promise = Promise.resolve(err(e));
      const stub = sandbox.stub(msgConn, "sendRequest").callsFake(() => {
        return promise;
      });
      const res = await appStudio.getJsonObject({ scopes: ["test"] });
      chai.expect(res.isErr()).equal(true);
      stub.restore();
    });

    it("getStatus: ok", async () => {
      const promise1 = Promise.resolve(
        ok("eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ")
      );
      const promise2 = Promise.resolve(
        ok(JSON.stringify('{"sub": "1234567890","name": "John Doe","iat": 1516239022}'))
      );
      const stub = sandbox
        .stub(msgConn, "sendRequest")
        .onFirstCall()
        .returns(Promise.resolve(promise1))
        .onSecondCall()
        .returns(Promise.resolve(promise2));
      const res = await appStudio.getStatus({ scopes: ["test"] });
      chai.expect(res.isOk()).equal(true);
      stub.restore();
    });

    it("signout", async () => {
      chai.expect(() => appStudio.signout()).to.throw(NotImplementedError);
    });

    it("setStatusChangeMap", async () => {
      chai
        .expect(() =>
          appStudio.setStatusChangeMap(
            "test",
            { scopes: ["test"] },
            (p1, p2?, p3?): Promise<void> => {
              return new Promise<void>((resolve) => {});
            }
          )
        )
        .to.throw(NotImplementedError);
    });

    it("removeStatusChangeMap", async () => {
      chai.expect(() => appStudio.removeStatusChangeMap("test")).to.throw(NotImplementedError);
    });
  });
});
