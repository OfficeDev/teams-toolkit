/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as spies from "chai-spies";
import * as sinon from "sinon";

import { TelemetryReporter } from "@microsoft/teamsfx-api";

import { TelemetryEventCache } from "../../src/telemetry/extTelemetryEvents";
import * as Telemetry from "../../src/telemetry/telemetry";
import { getAllFeatureFlags } from "../../src/utils/commonUtils";

chai.use(spies);
const expect = chai.expect;
const spy = chai.spy;

const reporterSpy = spy.interface({
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {},
  sendTelemetryEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {},
  sendTelemetryException(
    error: Error,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number }
  ): void {},
});
const cacheSpy = spy.interface({
  addEvent(event: TelemetryEventCache): void {},
});

const mock = require("mock-require");
mock("@vscode/extension-telemetry", {
  default: function (
    extensionId: string,
    extensionVersion: string,
    key: string,
    firstParty?: boolean
  ) {
    return reporterSpy;
  },
});

const featureFlags = getAllFeatureFlags()?.join(";") ?? "";

describe("telemetry", () => {
  let tester: TelemetryReporter;

  before(() => {
    tester = new Telemetry.VSCodeTelemetryReporter("test", "1.0.0-rc.1", "test");
    (tester as Telemetry.VSCodeTelemetryReporter).addSharedProperty("project-id", "");
    chai.util.addProperty(tester, "reporter", () => reporterSpy);
    chai.util.addProperty(Telemetry, "cache", () => cacheSpy);
  });

  it("sendTelemetryEvent", () => {
    const clock = sinon.useFakeTimers();
    tester.sendTelemetryEvent(
      "sampleEvent",
      { stringProp: "some string" },
      { numericMeasure: 123 }
    );

    expect(cacheSpy.addEvent).to.have.been.called.with({
      type: "normal",
      eventName: "sampleEvent",
      occurTime: new clock.Date(),
      properties: {
        stringProp: "some string",
        "project-id": "",
        "correlation-id": "",
        "feature-flags": featureFlags,
      },
      measurements: { numericMeasure: 123 },
    } as TelemetryEventCache);
    clock.restore();
  });

  it("sendTelemetryErrorEvent", () => {
    const clock = sinon.useFakeTimers();
    tester.sendTelemetryErrorEvent(
      "sampleErrorEvent",
      {
        stringProp: "some string",
        stackProp: "some user stack trace",
      },
      { numericMeasure: 123 },
      ["stackProp"]
    );

    expect(cacheSpy.addEvent).to.have.been.called.with({
      type: "error",
      eventName: "sampleErrorEvent",
      occurTime: new clock.Date(),
      properties: {
        stringProp: "some string",
        stackProp: "some user stack trace",
        "project-id": "",
        "correlation-id": "",
        "feature-flags": featureFlags,
      },
      measurements: { numericMeasure: 123 },
    } as TelemetryEventCache);
    clock.restore();
  });

  it("sendTelemetryException", () => {
    const error = new Error("error for test");
    tester.sendTelemetryException(error, { stringProp: "some string" }, { numericMeasure: 123 });

    expect(reporterSpy.sendTelemetryException).to.have.been.called.with(
      error,
      {
        stringProp: "some string",
        "project-id": "",
        "correlation-id": "",
        "feature-flags": featureFlags,
      },
      { numericMeasure: 123 }
    );
  });
});
