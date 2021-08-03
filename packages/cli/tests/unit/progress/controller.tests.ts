// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Colors } from "@microsoft/teamsfx-api";
import { MultiBar, SingleBar } from "cli-progress";
import sinon from "sinon";

import ProgressController from "../../../src/progress/controller";
import ProgressInstance from "../../../src/progress/instance";
import * as Utils from "../../../src/utils";
import { expect } from "../utils";

describe("Progress Controller", function () {
  const sandbox = sinon.createSandbox();
  const instance = new ProgressInstance("Test", 1);
  const controller = ProgressController.getInstance();
  if (controller["timer"]) {
    clearTimeout(controller["timer"]);
  }
  controller["progresses"] = [];

  beforeEach(() => {
    sandbox.stub(Date, "now").returns(0);
    sandbox
      .stub(Utils, "getColorizedString")
      .callsFake((msg: { content: string; color: Colors }[]) => {
        return msg.map((ob) => ob.content).join("");
      });
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(() => {
    if (controller["timer"]) {
      clearTimeout(controller["timer"]);
    }
  });

  it("activeNum", async () => {
    expect(controller.activeNum).equals(0);
  });

  it("runningChar", async () => {
    expect(controller.runningChar).equals("|");
  });

  it("register", async () => {
    controller.register(instance);
    expect(controller["progresses"].length).equals(1);
  });

  it("start", async () => {
    sandbox.stub(ProgressController.prototype, "update");
    controller.start();
  });

  it("end", async () => {
    const endStub = sandbox.stub(ProgressInstance.prototype, "end");
    const stopStub = sandbox.stub(MultiBar.prototype, "stop");
    controller["timer"] = setTimeout(() => {}, 0);
    controller["progresses"] = [instance];
    controller.end();
    sinon.assert.calledOnce(endStub);
    sinon.assert.calledOnce(stopStub);
    expect(controller["timer"]).equals(undefined);
  });

  it("update", async () => {
    sandbox.stub<any, any>(SingleBar.prototype, "update").callsFake((percentage, payload) => {
      expect(payload).deep.equals({
        message: instance.message,
        runningChar: controller.runningChar,
      });
    });
    controller["_activeNum"] = 1;
    controller["timer"] = setTimeout(() => {}, 0);
    controller["progresses"] = [instance];
    controller.update();
    clearTimeout(controller["timer"]!);
    expect(controller["timer"]).not.equals(undefined);
  });

  it("create", async () => {
    const startStub = sandbox.stub(ProgressController.prototype, "start");
    sandbox
      .stub(MultiBar.prototype, "create")
      .callsFake((total: number, startValue: number, payload?: any) => {
        expect(total).equals(100);
        expect(startValue).equals(0);
        expect(payload).deep.equals({
          message: "Test",
          runningChar: "|",
        });
        return new SingleBar({});
      });
    controller["_activeNum"] = 0;
    controller.create(100, 0, "Test");
    sinon.assert.calledOnce(startStub);
    expect(controller.activeNum).equals(1);
  });

  it("remove", async () => {
    sandbox.stub<any, any>(SingleBar.prototype, "update").callsFake((percentage, payload) => {
      expect(payload).deep.equals({
        message: "Test",
        runningChar: controller.runningChar,
      });
    });
    sandbox.stub(ProgressController.prototype, "end");
    const bar = new SingleBar({});
    controller["_activeNum"] = 1;
    controller.remove(bar, 0, "Test");
    expect(controller.activeNum).equals(0);
  });
});
