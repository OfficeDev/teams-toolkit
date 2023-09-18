// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import cliTelemetry from "../../src/telemetry/cliTelemetry";
import { CliTelemetryReporter } from "../../src/commonlib/telemetry";
import { UserCancelError } from "@microsoft/teamsfx-core";

describe("CLI Telemetry", function () {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  describe("disable", () => {
    it("no reporter", () => {
      cliTelemetry.enable = false;
    });
    it("sendTelemetryEvent", () => {
      cliTelemetry.reporter = new CliTelemetryReporter("real", "real", "real", "real");
      const spy = sandbox.spy(cliTelemetry.reporter.reporter, "sendTelemetryEvent");
      cliTelemetry.enable = false;
      cliTelemetry.sendTelemetryEvent("eventName");
      assert.isTrue(spy.notCalled);
    });
    it("sendTelemetryErrorEvent", () => {
      cliTelemetry.reporter = new CliTelemetryReporter("real", "real", "real", "real");
      const spy = sandbox.spy(cliTelemetry.reporter.reporter, "sendTelemetryErrorEvent");
      cliTelemetry.enable = false;
      cliTelemetry.sendTelemetryErrorEvent("eventName", new UserCancelError());
      assert.isTrue(spy.notCalled);
    });
    it("sendTelemetryException", () => {
      cliTelemetry.reporter = new CliTelemetryReporter("real", "real", "real", "real");
      const spy = sandbox.spy(cliTelemetry.reporter.reporter, "sendTelemetryException");
      cliTelemetry.enable = false;
      cliTelemetry.sendTelemetryException(new Error());
      assert.isTrue(spy.notCalled);
    });
  });
});
