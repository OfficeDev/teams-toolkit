// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { SingleBar } from "cli-progress";
import figures from "figures";
import sinon from "sinon";

import { Colors } from "@microsoft/teamsfx-api";

import ProgressController from "../../../src/progress/controller";
import ProgressInstance from "../../../src/progress/instance";
import * as Utils from "../../../src/utils";
import { expect } from "../utils";

describe("Progress Instance", function () {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ProgressController.prototype, "register");
    sandbox
      .stub(Utils, "getColorizedString")
      .callsFake((msg: { content: string; color: Colors }[]) => {
        return msg.map((ob) => ob.content).join("");
      });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("doneMessage", () => {
    const instance = new ProgressInstance("Test", 1);
    expect(instance.doneMessage).equal(`[1/1] Test: (${figures.tick}) Done`);
  });

  it("message", () => {
    const instance = new ProgressInstance("Test", 1);
    expect(instance.message).equal(`[0/1] Test: starting.`);
  });

  it("percentage", () => {
    const instance = new ProgressInstance("Test", 2);
    expect(instance.percentage).equal(0);
    instance["currentStep"] = 2;
    expect(instance.percentage).equals(5);
    instance["currentPercentage"] = 75;
    expect(instance.percentage).equal(75.1);
  });

  it("start", async () => {
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
    sandbox.stub(ProgressController.prototype, "remove");
    const stopStub = sandbox.stub(SingleBar.prototype, "stop");

    const instance = new ProgressInstance("Test", 1);
    instance["bar"] = new SingleBar({});
    await instance.end(true);
    expect(instance["bar"]).equals(undefined);
    expect(instance.percentage).equals(100);
    sinon.assert.calledOnce(stopStub);
  });

  it("next", async () => {
    const instance = new ProgressInstance("Test", 1);
    await instance.next("step 1");
    expect(instance["detail"]).equals("step 1");
  });
});
