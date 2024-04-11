// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, SystemError, UserError } from "@microsoft/teamsfx-api";
import sinon from "sinon";

import { CliTelemetryReporter } from "../../../src/commonlib/telemetry";
import cliTelemetry from "../../../src/telemetry/cliTelemetry";
import {
  TelemetryComponentType,
  TelemetryErrorType,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import { expect } from "../utils";

describe("Telemetry", function () {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("withRootFolder", () => {
    cliTelemetry.withRootFolder("real");
    expect(cliTelemetry["rootFolder"]).equals("real");
  });

  it("sendTelemetryEvent", () => {
    sandbox
      .stub(CliTelemetryReporter.prototype, "sendTelemetryEvent")
      .callsFake((eventName: string, properties?: any) => {
        expect(eventName).equals("eventName");
        expect(properties[TelemetryProperty.Component]).equals(TelemetryComponentType);
        expect(properties[TelemetryProperty.AppId]).equals(undefined);
      });
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    cliTelemetry.reporter = reporter;
    cliTelemetry.sendTelemetryEvent("eventName");
  });

  describe("sendTelemetryEvent", () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox
        .stub(CliTelemetryReporter.prototype, "sendTelemetryErrorEvent")
        .callsFake((eventName: string, properties?: any) => {
          expect(properties[TelemetryProperty.Component]).equals(TelemetryComponentType);
          expect(properties[TelemetryProperty.AppId]).equals(undefined);
          expect(properties[TelemetryProperty.Success]).equals(TelemetrySuccess.No);
          if (eventName === "UserError") {
            expect(properties[TelemetryProperty.ErrorType]).equals(TelemetryErrorType.UserError);
            expect(properties[TelemetryProperty.ErrorCode]).equals("ut.user");
            // expect(properties[TelemetryProperty.ErrorMessage]).equals("UserError");
          } else {
            expect(properties[TelemetryProperty.ErrorType]).equals(TelemetryErrorType.SystemError);
            expect(properties[TelemetryProperty.ErrorCode]).equals("ut.system");
            // expect(properties[TelemetryProperty.ErrorMessage]).equals("SystemError");
          }
        });
      const reporter = new CliTelemetryReporter("real", "real", "real", "real");
      cliTelemetry.reporter = reporter;
    });

    after(() => {
      sandbox.restore();
    });

    it("UserError", () => {
      const userError = new UserError("ut", "user", "UserError");
      cliTelemetry.sendTelemetryErrorEvent("UserError", userError);
    });

    it("SystemError", () => {
      const systemError = new SystemError("ut", "system", "SystemError");
      cliTelemetry.sendTelemetryErrorEvent("SystemError", systemError);
    });
  });

  it("sendTelemetryException", () => {
    sandbox
      .stub(CliTelemetryReporter.prototype, "sendTelemetryException")
      .callsFake((error: Error, properties?: any) => {
        expect(error.message).equals("exception");
        expect(properties[TelemetryProperty.Component]).equals(TelemetryComponentType);
        expect(properties[TelemetryProperty.AppId]).equals(undefined);
      });
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    cliTelemetry.reporter = reporter;
    cliTelemetry.sendTelemetryException(new Error("exception"));
  });

  it("flush", async () => {
    sandbox.stub(CliTelemetryReporter.prototype, "flush");
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    cliTelemetry.reporter = reporter;
    await cliTelemetry.flush();
  });
});
