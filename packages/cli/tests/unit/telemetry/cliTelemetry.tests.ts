// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ok, returnSystemError, returnUserError } from "@microsoft/teamsfx-api";
import sinon from "sinon";

import Telemetry, { CliTelemetry } from "../../../src/telemetry/cliTelemetry";
import { CliTelemetryReporter } from "../../../src/commonlib/telemetry";
import { UserSettings } from "../../../src/userSetttings";
import { expect } from "../utils";
import {
  TelemetryComponentType,
  TelemetryErrorType,
  TelemetryProperty,
  TelemetrySuccess,
} from "../../../src/telemetry/cliTelemetryEvents";
import * as Utils from "../../../src/utils";

describe("Telemetry", function () {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("setReporter", () => {
    sandbox.stub(UserSettings, "getTelemetrySetting").returns(ok(false));
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    CliTelemetry.setReporter(reporter);
  });

  it("getReporter", () => {
    sandbox.stub(UserSettings, "getTelemetrySetting").returns(ok(false));
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    CliTelemetry.setReporter(reporter);
    expect(CliTelemetry.getReporter()["reporter"]);
  });

  it("withRootFolder", () => {
    Telemetry.withRootFolder("real");
    expect(CliTelemetry["rootFolder"]).equals("real");
  });

  it("sendTelemetryEvent", () => {
    sandbox.stub(UserSettings, "getTelemetrySetting").returns(ok(false));
    sandbox.stub(Utils, "getTeamsAppId").returns(undefined);
    sandbox
      .stub(CliTelemetryReporter.prototype, "sendTelemetryEvent")
      .callsFake((eventName: string, properties?: any) => {
        expect(eventName).equals("eventName");
        expect(properties[TelemetryProperty.Component]).equals(TelemetryComponentType);
        expect(properties[TelemetryProperty.AppId]).equals(undefined);
      });
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    CliTelemetry.setReporter(reporter);
    Telemetry.sendTelemetryEvent("eventName");
  });

  describe("sendTelemetryEvent", () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(UserSettings, "getTelemetrySetting").returns(ok(false));
      sandbox.stub(Utils, "getTeamsAppId").returns(undefined);
      sandbox
        .stub(CliTelemetryReporter.prototype, "sendTelemetryErrorEvent")
        .callsFake((eventName: string, properties?: any) => {
          expect(properties[TelemetryProperty.Component]).equals(TelemetryComponentType);
          expect(properties[TelemetryProperty.AppId]).equals(undefined);
          expect(properties[TelemetryProperty.Success]).equals(TelemetrySuccess.No);
          if (eventName === "UserError") {
            expect(properties[TelemetryProperty.ErrorType]).equals(TelemetryErrorType.UserError);
            expect(properties[TelemetryProperty.ErrorCode]).equals("ut.user");
            expect(properties[TelemetryProperty.ErrorMessage]).equals("UserError");
          } else {
            expect(properties[TelemetryProperty.ErrorType]).equals(TelemetryErrorType.SystemError);
            expect(properties[TelemetryProperty.ErrorCode]).equals("ut.system");
            expect(properties[TelemetryProperty.ErrorMessage]).equals("SystemError");
          }
        });
      const reporter = new CliTelemetryReporter("real", "real", "real", "real");
      CliTelemetry.setReporter(reporter);
    });

    after(() => {
      sandbox.restore();
    });

    it("UserError", () => {
      const userError = returnUserError(new Error("UserError"), "ut", "user");
      Telemetry.sendTelemetryErrorEvent("UserError", userError);
    });

    it("SystemError", () => {
      const systemError = returnSystemError(new Error("SystemError"), "ut", "system");
      Telemetry.sendTelemetryErrorEvent("SystemError", systemError);
    });
  });

  it("sendTelemetryException", () => {
    sandbox.stub(UserSettings, "getTelemetrySetting").returns(ok(false));
    sandbox.stub(Utils, "getTeamsAppId").returns(undefined);
    sandbox
      .stub(CliTelemetryReporter.prototype, "sendTelemetryException")
      .callsFake((error: Error, properties?: any) => {
        expect(error.message).equals("exception");
        expect(properties[TelemetryProperty.Component]).equals(TelemetryComponentType);
        expect(properties[TelemetryProperty.AppId]).equals(undefined);
      });
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    CliTelemetry.setReporter(reporter);
    Telemetry.sendTelemetryException(new Error("exception"));
  });

  it("flush", async () => {
    sandbox.stub(CliTelemetryReporter.prototype, "flush");
    sandbox.stub(UserSettings, "getTelemetrySetting").returns(ok(false));
    const reporter = new CliTelemetryReporter("real", "real", "real", "real");
    CliTelemetry.setReporter(reporter);
    await Telemetry.flush();
  });
});
