// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TelemetryClient } from "applicationinsights";
import sinon from "sinon";

import Logger from "../../../src/commonlib/log";
import Reporter from "../../../src/telemetry/telemetryReporter";
import { expect } from "../utils";

describe("Telemetry Reporter", function () {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("getCommonProperties", () => {
    const reporter = new Reporter("real", "real", "real", "real");
    const properties = reporter["getCommonProperties"]();
    expect(Object.keys(properties)).deep.equals([
      "common.os",
      "common.platformversion",
      "common.cliversion",
      "common.machineid",
    ]);
  });

  it("cloneAndChange", () => {
    const reporter = new Reporter("real", "real", "real", "real");
    const obj = {
      a: "aa",
      b: "bb",
    };
    const change = (key: string, val: string) => [key, val].join(",");
    const properties = reporter["cloneAndChange"](obj, change);
    expect(properties).deep.equals({
      a: "a,aa",
      b: "b,bb",
    });
    expect(obj).deep.equals({
      a: "aa",
      b: "bb",
    });
  });

  describe("anonymizeFilePaths", () => {
    const sandbox = sinon.createSandbox();

    before(() => {});

    after(() => {
      sandbox.restore();
    });

    it("No stack", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["anonymizeFilePaths"]();
      expect(result).equals("");
    });

    it("abcdefg", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["anonymizeFilePaths"]("abcdefg");
      expect(result).equals("abcdefg");
    });

    it("abcrealdefg", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["anonymizeFilePaths"]("abcrealdefg");
      expect(result).equals("abcdefg");
    });

    it("file://abc/real./defg", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["anonymizeFilePaths"]("file://abc/real./defg");
      expect(result).equals("<REDACTED: user-file-path>");
    });
  });

  describe("removePropertiesWithPossibleUserInfo", () => {
    const sandbox = sinon.createSandbox();

    before(() => {});

    after(() => {
      sandbox.restore();
    });

    it("undefined", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["removePropertiesWithPossibleUserInfo"](undefined);
      expect(result).equals(undefined);
    });

    it("abcdefg", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["removePropertiesWithPossibleUserInfo"]({ a: "abcdefg" });
      expect(result).deep.equals({ a: "abcdefg" });
    });

    it("xxxx@yyy.zzz", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["removePropertiesWithPossibleUserInfo"]({ a: "xxxx@yyy.zzz" });
      expect(result).deep.equals({ a: "<REDACTED: email>" });
    });

    it("password", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["removePropertiesWithPossibleUserInfo"]({ a: "ssword=sasdfsdf" });
      expect(result).deep.equals({ a: "<REDACTED: password>" });
    });

    it("token", () => {
      const reporter = new Reporter("real", "real", "real", "real");
      const result = reporter["removePropertiesWithPossibleUserInfo"]({ a: "token=asdfasdfasdf" });
      expect(result).deep.equals({ a: "<REDACTED: token>" });
    });
  });

  it("sendTelemetryEvent", () => {
    sandbox.stub(TelemetryClient.prototype, "trackEvent");
    sandbox.stub(Logger, "debug");
    const reporter = new Reporter("real", "real", "real", "real");
    reporter["appInsightsClient"] = new TelemetryClient("123");
    reporter.sendTelemetryEvent("eventName", { a: "real" });
  });

  it("sendTelemetryErrorEvent", () => {
    sandbox.stub(TelemetryClient.prototype, "trackEvent");
    sandbox.stub(Logger, "debug");
    const reporter = new Reporter("real", "real", "real", "real");
    reporter["appInsightsClient"] = new TelemetryClient("123");
    reporter.sendTelemetryErrorEvent("eventName", { a: "real" });
  });

  it("sendTelemetryException", () => {
    sandbox.stub(TelemetryClient.prototype, "trackEvent");
    sandbox.stub(Logger, "debug");
    const reporter = new Reporter("real", "real", "real", "real");
    reporter["appInsightsClient"] = new TelemetryClient("123");
    reporter.sendTelemetryException(new Error("test error"), { a: "real" });
  });

  it("flush", async () => {
    sandbox.stub(TelemetryClient.prototype, "flush").callsFake((op) => {
      op?.callback?.("");
    });
    sandbox.stub(Logger, "debug");
    const reporter = new Reporter("real", "real", "real", "real");
    reporter["appInsightsClient"] = new TelemetryClient("123");
    await reporter.flush();
  });
});
