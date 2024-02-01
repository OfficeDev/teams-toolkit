// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IProgressHandler } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import { createTaskStartCb, createTaskStopCb } from "../../../../src/cmds/preview/commonUtils";
import { expect } from "../../utils";

describe("commonUtils", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  describe("createTaskStartCb", () => {
    it("happy path", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStartCallback = createTaskStartCb(progressHandler, "start message");
      await taskStartCallback("start", true);
      expect(progressHandler.start.calledOnce).to.be.true;
    });
  });
  describe("createTaskStopCb", () => {
    it("happy path", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStopCallback = createTaskStopCb(progressHandler);
      await taskStopCallback("stop", true, {
        command: "command",
        success: true,
        stdout: [],
        stderr: [],
        exitCode: null,
      });
      expect(progressHandler.end.calledOnce).to.be.true;
    });

    it("happy path 2", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStopCallback = createTaskStopCb(progressHandler, { k: "v" });
      await taskStopCallback("npm install", false, {
        command: "command",
        success: false,
        stdout: [],
        stderr: [],
        exitCode: 1,
      });
      expect(progressHandler.end.calledOnce).to.be.true;
    });
  });
});

class MockProgressHandler implements IProgressHandler {
  start(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  next(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  end(success: boolean): Promise<void> {
    return Promise.resolve();
  }
}
