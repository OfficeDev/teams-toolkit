// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";

import { LogLevel } from "@microsoft/teamsfx-api";

import ProgressController from "../../../src/progress/controller";
import ProgressInstance from "../../../src/progress/instance";
import Logger from "../../../src/commonlib/log";
import { expect } from "../utils";
import { MultiBar, SingleBar } from "cli-progress";

describe("Progress Instance", function () {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ProgressController.prototype, "register");
    sandbox.stub(ProgressController.prototype, "start");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("start", async () => {
    sandbox.stub(ProgressInstance.prototype, "end");
    sandbox.stub(ProgressInstance.prototype, "show");
    sandbox
      .stub(ProgressController.prototype, "create")
      .callsFake((total: number, startValue: number, message: string) => {
        expect(total).equals(100);
        expect(message).equals("[0/1] Test: start");
        return new SingleBar({});
      });

    const instance = new ProgressInstance("Test", 1);
    await instance.start("start");
  });

  it("end", async () => {
    sandbox.stub(ProgressInstance.prototype, "show");
    sandbox.stub(MultiBar.prototype, "remove");
    const stopStub = sandbox.stub(SingleBar.prototype, "stop");

    const instance = new ProgressInstance("Test", 1);
    instance["bar"] = new SingleBar({});
    instance["currentStep"] = 10;
    instance["currentPercentage"] = 100;
    await instance.end();
    expect(instance["currentStep"]).equals(0);
    expect(instance["currentPercentage"]).equals(0);
    sinon.assert.calledOnce(stopStub);
  });

  it("next", async () => {
    sandbox.stub(ProgressInstance.prototype, "show");
    const instance = new ProgressInstance("Test", 1);
    await instance.next("step 1");
    expect(instance["detail"]).equals("step 1");
  });

  it("update", () => {
    sandbox.stub(SingleBar.prototype, "update");
    const instance = new ProgressInstance("Test", 1);
    instance["bar"] = new SingleBar({});
    instance.update({});
  });

  it("show", () => {
    sandbox.stub(ProgressController.prototype, "clear");
    sandbox
      .stub(Logger, "necessaryLog")
      .callsFake((level: LogLevel, message: string, white?: boolean) => {
        expect(level).equals(LogLevel.Info);
        expect(message).equals("[0/1] Test: starting.");
        expect(white).to.be.true;
      });
    const instance = new ProgressInstance("Test", 1);
    instance.show();
  });
});
