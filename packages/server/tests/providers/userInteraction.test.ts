// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok } from "@microsoft/teamsfx-api";
import { assert, expect } from "chai";
import "mocha";
import sinon from "sinon";
import { Duplex } from "stream";
import { createMessageConnection } from "vscode-jsonrpc";
import { RequestTypes } from "../../src/apis";
import ServerUserInteraction from "../../src/providers/userInteraction";

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

describe("userInteraction", () => {
  const sandbox = sinon.createSandbox();
  const up = new TestStream();
  const down = new TestStream();
  const msgConn = createMessageConnection(up as any, down as any);

  after(() => {
    sandbox.restore();
  });

  it("constructor", () => {
    const ui = new ServerUserInteraction(msgConn);
    assert.equal(msgConn, ui["connection"]);
  });

  describe("method", () => {
    const promise = Promise.resolve(ok("test"));
    const stub = sandbox.stub(msgConn, "sendRequest").callsFake(() => {
      return promise;
    });
    const ui = new ServerUserInteraction(msgConn);

    afterEach(() => {
      stub.restore();
    });

    it("selectOption", () => {
      const config = {
        name: "test name",
        title: "test title",
        options: ["option1", "option2"],
      };
      const res = ui.selectOption(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.selectOption, config);
      });
    });

    it("selectOptions", () => {
      const config = {
        name: "test name",
        title: "test title",
        options: ["option1", "option2"],
      };
      const res = ui.selectOptions(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.selectOptions, config);
      });
    });

    it("inputText", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.inputText(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.inputText, config);
      });
    });

    it("openUrl", () => {
      const url = "test url";
      const res = ui.openUrl(url);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.openUrl, url);
      });
    });

    it("openFile", () => {
      const path = "path";
      const res = ui.openFile(path);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.openFile, path);
      });
    });

    it("selectFile", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.selectFile(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.selectFile, config);
      });
    });

    it("selectFiles", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.selectFiles(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.inputText, config);
      });
    });

    it("selectFolder", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.selectFolder(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.inputText, config);
      });
    });

    it("showMessage", () => {
      const res = ui.showMessage("info", "test message", false, "test item");
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(
          RequestTypes.ui.showMessage,
          "info",
          "test message",
          false,
          "test item"
        );
      });
    });
    it("confirm", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.confirm(config);
      res.then((data) => {
        expect(data).equal("test");
        expect(stub).is.called.with(RequestTypes.ui.confirm, config);
      });
    });
    it("createProgressBar", async () => {
      expect(ui.createProgressBar("test title", 5)).to.not.throw;
      const a = ui.createProgressBar("test title", 5);
      await a.start();
      await a.next();
      await a.end(true);
    });
  });
});
