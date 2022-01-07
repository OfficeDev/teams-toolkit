// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { DepsLoggerAdapter, DepsTelemetryAdapter } from "../../../src/common/local/depsAdapter";
import { DepsCheckerEvent } from "../../../src/common/deps-checker/constant/telemetry";

chai.use(chaiAsPromised);

// TODO: update test case after implement the adapter
describe("DepsAdapter", () => {
  describe("DepsTelemetryAdapter", () => {
    it("sendEvent", async () => {
      const telemetry = new DepsTelemetryAdapter(undefined);
      telemetry.sendEvent(DepsCheckerEvent.npmNotFound);
    });

    it("sendEventWithDuration", async () => {
      const telemetry = new DepsTelemetryAdapter(undefined);
      telemetry.sendEventWithDuration(DepsCheckerEvent.npmNotFound, async () => {
        return;
      });
    });

    it("sendUserErrorEvent", async () => {
      const telemetry = new DepsTelemetryAdapter(undefined);
      telemetry.sendUserErrorEvent(DepsCheckerEvent.npmNotFound, "error message");
    });

    it("sendSystemErrorEvent", async () => {
      const telemetry = new DepsTelemetryAdapter(undefined);
      telemetry.sendSystemErrorEvent(DepsCheckerEvent.npmNotFound, "error message", "error stack");
    });
  });

  describe("DepsLogAdapter", () => {
    it("debug", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.debug("");
    });

    it("info", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.info("");
    });

    it("warning", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.warning("");
    });

    it("error", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.error("");
    });

    it("append", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.append("");
    });

    it("appendLine", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.appendLine("");
    });

    it("printDetailLog", async () => {
      const logger = new DepsLoggerAdapter(undefined);
      await logger.printDetailLog();
    });
  });
});
