// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { logger } from "../../../src/commonlib/logger";
import { CliTelemetryReporter } from "../../../src/commonlib/telemetry";

describe("CliTelemetryReporter", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("sendTelemetryErrorEvent", async () => {
    it("happy path", async () => {
      const reporter = new CliTelemetryReporter("real", "real", "real", "real");
      const debugStub = sandbox.stub(logger, "debug");
      const sendStub = sandbox.stub(reporter.reporter, "sendTelemetryErrorEvent");
      reporter.sendTelemetryErrorEvent("test");
      assert.isTrue(debugStub.called);
      assert.isTrue(sendStub.called);
    });
  });

  describe("sendTelemetryException", async () => {
    it("happy path", async () => {
      const reporter = new CliTelemetryReporter("real", "real", "real", "real");
      const stub = sandbox.stub(reporter.reporter, "sendTelemetryException");
      reporter.sendTelemetryException(new Error("test"));
      assert.isTrue(stub.called);
    });
  });
});
