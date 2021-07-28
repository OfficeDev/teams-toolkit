// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import sinon from "sinon";
import { LogLevel } from "@microsoft/teamsfx-api";

import { ProgressHandler } from "../../src/progressHandler";
import Logger from "../../src/commonlib/log";
import * as constants from "../../src/constants";
import { expect } from "./utils";

describe("Progress Handler", function () {
  const sandbox = sinon.createSandbox();
  let levels: LogLevel[] = [];
  let msgs: string[] = [];

  before(() => {
    sandbox.stub(Logger, "necessaryLog").callsFake((level: LogLevel, message: string) => {
      levels.push(level);
      msgs.push(message);
    });
  });

  after(() => {
    sandbox.restore();
  });

  afterEach(() => {
    levels = [];
    msgs = [];
  });

  it("start", async () => {
    const handler = new ProgressHandler("Test", 1);
    await handler.start("start");
    expect(levels).deep.equals([LogLevel.Info]);
    expect(msgs).deep.equals([`[${constants.cliSource}] Test: [0/1] start`]);
  });

  it("next", async () => {
    const handler = new ProgressHandler("Test", 1);
    await handler.next("step 1");
    expect(levels).deep.equals([LogLevel.Info]);
    expect(msgs).deep.equals([`[${constants.cliSource}] Test: [1/1] step 1`]);
  });

  it("end", async () => {
    const handler = new ProgressHandler("Test", 1);
    handler["currentStep"] = 10;
    await handler.end();
    expect(handler["currentStep"]).equals(0);
  });
});
