// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";

import ProgressController from "../../../src/progress/controller";
import ProgressInstance from "../../../src/progress/instance";
import { expect } from "../utils";
import { MultiBar, SingleBar } from "cli-progress";

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
    if (controller["timer"]) {
      clearTimeout(controller["timer"]);
    }
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("runningChar", async () => {
    expect(controller.runningChar).equals("|");
  });

  it("register", async () => {
    controller.register(instance);
    expect(controller["progresses"].length).equals(1);
  });

  it("end", async () => {
    const endStub = sandbox.stub(ProgressInstance.prototype, "end");
    controller["timer"] = setTimeout(() => {}, 0);
    controller["progresses"] = [instance];
    controller.end();
    sinon.assert.calledOnce(endStub);
    expect(controller["timer"]).equals(undefined);
  });

  it("update", async () => {
    sandbox.stub(ProgressInstance.prototype, "update").callsFake((payload) => {
      expect(payload).deep.equals({
        message: instance.message,
        runningChar: controller.runningChar,
      });
    });
    controller["timer"] = setTimeout(() => {}, 0);
    controller["progresses"] = [instance];
    controller.update();
    expect(controller["timer"]).not.equals(undefined);
  });

  it("create", async () => {
    sandbox
      .stub(MultiBar.prototype, "create")
      .callsFake((total: number, startValue: number, payload?: any) => {
        expect(total).equals(100);
        expect(startValue).equals(0);
        expect(payload).deep.equals({
          message: "Test",
          runningChar: controller.runningChar,
        });
        return new SingleBar({});
      });
    controller.create(100, 0, "Test");
  });
});
