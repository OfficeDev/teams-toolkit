/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import * as chai from "chai";
import { VSCodeTelemetryReporter } from "../../src/telemetry/vscodeTelemetryReporter";
import { getAllFeatureFlags } from "../../src/featureFlags";
import { MockTelemetryReporter } from "../mocks/mockTools";

const featureFlags = getAllFeatureFlags()?.join(";") ?? "";

describe("vscodeTelemetryReporter", () => {
  let tester: VSCodeTelemetryReporter;
  const sandbox = sinon.createSandbox();
  const reporterStub = new MockTelemetryReporter();
  const sendTelemetryErrorEventSpy = sandbox.spy(reporterStub, "sendTelemetryErrorEvent");
  const sendTelemetryEventSpy = sandbox.spy(reporterStub, "sendTelemetryEvent");
  const sendTelemetryExceptionSpy = sandbox.spy(reporterStub, "sendTelemetryException");

  before(() => {
    tester = new VSCodeTelemetryReporter("test", "1.0.0-rc.1", "test");
    tester.addSharedProperty("project-id", "");
    tester.addSharedProperty("programming-language", "");
    tester.addSharedProperty("host-type", "");
    tester.addSharedProperty("is-from-sample", "");
    chai.util.addProperty(tester, "reporter", () => reporterStub);
  });

  after(() => {
    tester.dispose();
    sandbox.restore();
  });

  it("sendTelemetryEvent", () => {
    tester.sendTelemetryEvent(
      "sampleEvent",
      { stringProp: "some string" },
      { numericMeasure: 123 }
    );

    sinon.assert.calledOnceWithMatch(
      sendTelemetryEventSpy,
      "sampleEvent",
      {
        stringProp: "some string",
        "project-id": "",
        "correlation-id": "",
        "feature-flags": featureFlags,
        "programming-language": "",
        "host-type": "",
        "is-from-sample": "",
      },
      { numericMeasure: 123 }
    );
  });

  it("sendTelemetryErrorEvent", () => {
    tester.sendTelemetryErrorEvent(
      "sampleErrorEvent",
      {
        stringProp: "some string",
        "error-stack": "some user stack trace at (C:/fake_path/fake_file:1:1)",
      },
      { numericMeasure: 123 },
      ["error-stack"]
    );

    sinon.assert.calledOnceWithMatch(
      sendTelemetryErrorEventSpy,
      "sampleErrorEvent",
      {
        stringProp: "some string",
        "error-stack": "some user stack trace at (<REDACTED: user-file-path>/fake_file:1:1)",
        "project-id": "",
        "correlation-id": "",
        "feature-flags": featureFlags,
        "programming-language": "",
        "host-type": "",
        "is-from-sample": "",
      },
      { numericMeasure: 123 }
    );
  });

  it("sendTelemetryException", () => {
    const error = new Error("error for test");
    tester.sendTelemetryException(error, { stringProp: "some string" }, { numericMeasure: 123 });

    sinon.assert.calledOnceWithMatch(
      sendTelemetryExceptionSpy,
      error,
      {
        stringProp: "some string",
        "project-id": "",
        "correlation-id": "",
        "feature-flags": featureFlags,
        "programming-language": "",
        "host-type": "",
        "is-from-sample": "",
      },
      { numericMeasure: 123 }
    );
  });
});
