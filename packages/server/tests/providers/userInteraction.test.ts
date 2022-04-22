// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import { Duplex } from "stream";
import sinon from "sinon";
import ServerUserInteraction from "../../src/providers/userInteraction";
import { createMessageConnection } from "vscode-jsonrpc";
import { RequestTypes } from "../../src/apis";
import {
  ok,
  IProgressHandler,
  RunnableTask,
  TaskConfig,
  Result,
  FxError,
} from "@microsoft/teamsfx-api";

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
    this.emit("data", chunk);
    done();
  }

  _read(_size: number) {}
}

class MockRunnableTask implements RunnableTask<string> {
  run(...args: any): Promise<Result<string, FxError>> {
    return Promise.resolve(ok("test"));
  }
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
    const utils = require("../../src/utils");
    const spy = sandbox.spy(utils, "getResponseWithErrorHandling");
    sandbox.stub(utils, "convertUIConfigToJson").callsFake((p) => {
      return p;
    });

    afterEach(() => {
      stub.restore();
      spy.restore();
    });

    it("selectOption", () => {
      const config = {
        name: "test name",
        title: "test title",
        options: ["option1", "option2"],
      };
      const res = ui.selectOption(config);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.selectOption, config);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("selectOptions", () => {
      const config = {
        name: "test name",
        title: "test title",
        options: ["option1", "option2"],
      };
      const res = ui.selectOptions(config);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.selectOptions, config);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("inputText", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.inputText(config);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.inputText, config);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("openUrl", () => {
      const url = "test url";
      const res = ui.openUrl(url);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.openUrl, url);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("selectFile", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.selectFile(config);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.selectFile, config);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("selectFiles", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.selectFiles(config);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.inputText, config);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("selectFolder", () => {
      const config = {
        name: "test name",
        title: "test title",
      };
      const res = ui.selectFolder(config);
      res.then((data) => {
        expect(stub).is.called.with(RequestTypes.ui.inputText, config);
      });
      assert(spy.calledOnceWith(promise));
    });

    it("showMessage", () => {
      const res = ui.showMessage("info", "test message", false, "test item");
      res.then((data) => {
        expect(stub).is.called.with(
          RequestTypes.ui.showMessage,
          "info",
          "test message",
          false,
          "test item"
        );
      });
      assert(spy.calledOnceWith(promise));
    });

    it("createProgressBar", () => {
      expect(ui.createProgressBar("test title", 5)).to.not.throw;
    });

    it("runWithProgress", () => {
      expect(ui.runWithProgress(new MockRunnableTask(), {})).to.throw;
    });
  });
});
