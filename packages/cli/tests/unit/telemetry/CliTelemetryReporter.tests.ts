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
      sandbox.stub(reporter.reporter, "sendTelemetryErrorEvent").returns();
      reporter.sendTelemetryErrorEvent("test");
      assert.isTrue(debugStub.called);
    });
  });

  describe("sendTelemetryException", async () => {
    it("happy path", async () => {
      const reporter = new CliTelemetryReporter("real", "real", "real", "real");
      sandbox.stub(reporter.reporter, "sendTelemetryException").returns();
      reporter.sendTelemetryException(new Error("test"));
      assert.isTrue(true);
    });
  });
});
