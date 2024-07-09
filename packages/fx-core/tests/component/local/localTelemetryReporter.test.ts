// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, UserError, err, ok } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import {
  LocalTelemetryReporter,
  TelemetryContext,
} from "../../../src/component/local/localTelemetryReporter";

chai.use(chaiAsPromised);

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("localTelemetryReporter", () => {
  let reporter: LocalTelemetryReporter;
  const testEventName = "test-event";
  const testStartEventName = testEventName + "-start";

  let mockedEvents: {
    type: "event" | "error";
    eventName: string;
    error?: Error;
    properties?: { [key: string]: string };
    measurements?: { [key: string]: number };
    errorProps?: string[];
  }[] = [];
  let eventTime: { [key: string]: number } = {};

  const mockToolReporter = {
    sendTelemetryErrorEvent: (
      eventName: string,
      error: FxError,
      properties?: { [key: string]: string },
      measurements?: { [key: string]: number },
      errorProps?: string[]
    ): void => {
      mockedEvents.push({
        type: "error",
        error,
        eventName,
        properties,
        measurements,
        errorProps,
      });
    },

    sendTelemetryEvent: (
      eventName: string,
      properties?: { [p: string]: string },
      measurements?: { [p: string]: number }
    ): void => {
      mockedEvents.push({ type: "event", eventName, properties, measurements });
    },
  };
  beforeEach(() => {
    reporter = new LocalTelemetryReporter(mockToolReporter, (eventName: string, time: number) => {
      eventTime[eventName] = time;
    });
    mockedEvents = [];
    eventTime = {};
  });

  describe("runWithTelemetry", () => {
    it("success", async () => {
      // Act
      const result = await reporter.runWithTelemetry(testEventName, async () => {
        return ok("ok");
      });

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), "ok");

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[0].type, "event");
      chai.assert.equal(mockedEvents[0].eventName, testStartEventName);
      chai.assert.deepEqual(mockedEvents[0].properties, {});
      chai.assert.equal(mockedEvents[1].type, "event");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[1].properties, { success: "yes" });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
    });

    it("FxError", async () => {
      // Act
      const error = new UserError({ name: "TestError" });
      const result = await reporter.runWithTelemetry(testEventName, async () => {
        return err(error);
      });

      // Assert
      chai.assert.isTrue(result.isErr());
      chai.assert.equal(result._unsafeUnwrapErr().name, error.name);

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[1].type, "error");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.equal(mockedEvents[1].error, error);
      chai.assert.deepEqual(mockedEvents[1].properties, {
        success: "no",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testStartEventName,
      });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
    });

    it("exception", async () => {
      // Act
      const error = new UserError({ name: "TestError" });
      let exception = undefined;
      try {
        await reporter.runWithTelemetry(testEventName, async () => {
          throw error;
        });
      } catch (e) {
        exception = e;
      }

      // Assert
      chai.assert.isNotEmpty(exception);

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[1].type, "error");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.equal(mockedEvents[1].error, exception);
      chai.assert.deepEqual(mockedEvents[1].properties, {
        success: "no",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testStartEventName,
      });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
    });

    it("lastEventName", async () => {
      chai.assert.equal(reporter.getLastEventName(), LocalTelemetryReporter.NoLastEventName);

      // Act
      await reporter.runWithTelemetry(testEventName, async () => {
        return ok("ok");
      });
      const lastEventName = reporter.getLastEventName();

      // Assert
      chai.assert.equal(lastEventName, testEventName);
    });

    it("nested success", async () => {
      const testInnerEvent = "test-inner-event";
      const testStartInnerEvent = testInnerEvent + "-start";
      // Act

      const result = await reporter.runWithTelemetry(testEventName, async () => {
        return await reporter.runWithTelemetry(testInnerEvent, async () => {
          return ok("ok");
        });
      });

      // Assert
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(result._unsafeUnwrap(), "ok");

      chai.assert.equal(mockedEvents.length, 4);

      chai.assert.equal(mockedEvents[0].type, "event");
      chai.assert.equal(mockedEvents[0].eventName, testStartEventName);
      chai.assert.deepEqual(mockedEvents[0].properties, {});

      chai.assert.equal(mockedEvents[1].type, "event");
      chai.assert.equal(mockedEvents[1].eventName, testStartInnerEvent);
      chai.assert.deepEqual(mockedEvents[1].properties, {});

      chai.assert.equal(mockedEvents[2].type, "event");
      chai.assert.equal(mockedEvents[2].eventName, testInnerEvent);
      chai.assert.deepEqual(mockedEvents[2].properties, { success: "yes" });
      chai.assert.isTrue(Object.keys(mockedEvents[2].measurements || {}).includes("duration"));

      chai.assert.equal(mockedEvents[3].type, "event");
      chai.assert.equal(mockedEvents[3].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[3].properties, { success: "yes" });
      chai.assert.isTrue(Object.keys(mockedEvents[3].measurements || {}).includes("duration"));
    });

    it("nested exception", async () => {
      const testInnerEvent = "test-inner-event";
      const testStartInnerEvent = testInnerEvent + "-start";
      const error = new Error("test error");

      // Act
      let exception = undefined;
      try {
        await reporter.runWithTelemetry(testEventName, async () => {
          return await reporter.runWithTelemetry(testInnerEvent, async () => {
            throw error;
          });
        });
      } catch (e) {
        exception = e;
      }

      // Assert
      chai.assert.equal(exception, error);

      chai.assert.equal(mockedEvents.length, 4);

      chai.assert.equal(mockedEvents[0].type, "event");
      chai.assert.equal(mockedEvents[0].eventName, testStartEventName);
      chai.assert.deepEqual(mockedEvents[0].properties, {});

      chai.assert.equal(mockedEvents[1].type, "event");
      chai.assert.equal(mockedEvents[1].eventName, testStartInnerEvent);
      chai.assert.deepEqual(mockedEvents[1].properties, {});

      chai.assert.equal(mockedEvents[2].type, "error");
      chai.assert.equal(mockedEvents[2].eventName, testInnerEvent);
      chai.assert.deepEqual(mockedEvents[2].properties, {
        success: "no",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testStartInnerEvent,
      });
      chai.assert.isTrue(Object.keys(mockedEvents[2].measurements || {}).includes("duration"));

      chai.assert.equal(mockedEvents[3].type, "error");
      chai.assert.equal(mockedEvents[3].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[3].properties, {
        success: "no",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testInnerEvent,
      });
      chai.assert.isTrue(Object.keys(mockedEvents[3].measurements || {}).includes("duration"));
    });

    it("calculates correct durations", async () => {
      const actualDuration = 1048576;
      const clock = sinon.useFakeTimers();
      const resultPromise = reporter.runWithTelemetry(testEventName, async () => {
        await sleep(actualDuration);
        return ok(undefined);
      });

      clock.tick(actualDuration);
      await resultPromise;

      chai.assert.equal(mockedEvents[1].measurements?.["duration"], actualDuration / 1000);
    });

    it("event time", async () => {
      const event1 = "event1";
      const event1Start = "event1-start";
      const event2 = "event2";
      const event2Start = "event2-start";

      // Act
      const clock = sinon.useFakeTimers();
      const promise1 = reporter.runWithTelemetry(event1, async () => {
        return ok(undefined);
      });

      clock.tick(1);
      await promise1;

      clock.tick(2);
      const promise2 = reporter.runWithTelemetry(event2, async () => {
        return ok(undefined);
      });

      clock.tick(3);
      await promise2;

      // Assert
      const t0 = eventTime[event1Start];
      chai.assert.equal(eventTime[event1] - t0, 1);
      chai.assert.equal(eventTime[event2Start] - t0, 3);
      chai.assert.equal(eventTime[event2] - t0, 6);
    });
  });

  describe("runWithTelemetryGeneric", () => {
    it("success", async () => {
      // Act
      const result = await reporter.runWithTelemetryGeneric(
        testEventName,
        async () => {
          return "test result";
        },
        () => undefined
      );

      // Assert
      chai.assert.equal(result, "test result");

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[0].type, "event");
      chai.assert.equal(mockedEvents[0].eventName, testStartEventName);
      chai.assert.equal(mockedEvents[1].type, "event");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[1].properties, { success: "yes" });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
    });

    it("FxError", async () => {
      // Act
      const error = new UserError({ name: "TestError" });
      const actualResult = "failed";
      const result = await reporter.runWithTelemetryGeneric(
        testEventName,
        async () => {
          return actualResult;
        },
        () => error
      );

      // Assert
      chai.assert.equal(result, actualResult);

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[1].type, "error");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.equal(mockedEvents[1].error, error);
      chai.assert.deepEqual(mockedEvents[1].properties, {
        success: "no",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testStartEventName,
      });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
    });

    it("exception", async () => {
      // Act
      const error = new UserError({ name: "TestError" });
      let exception = undefined;
      try {
        await reporter.runWithTelemetryGeneric(
          testEventName,
          async () => {
            throw error;
          },
          () => undefined
        );
      } catch (e) {
        exception = e;
      }

      // Assert
      chai.assert.isNotEmpty(exception);

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[1].type, "error");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.equal(mockedEvents[1].error, exception);
      chai.assert.deepEqual(mockedEvents[1].properties, {
        success: "no",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testStartEventName,
      });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
    });

    it("lastEventName", async () => {
      chai.assert.equal(reporter.getLastEventName(), LocalTelemetryReporter.NoLastEventName);

      // Act
      await reporter.runWithTelemetryGeneric(
        testEventName,
        async () => {
          return ok("ok");
        },
        () => undefined
      );
      const lastEventName = reporter.getLastEventName();

      // Assert
      chai.assert.equal(lastEventName, testEventName);
    });

    it("custom properties", async () => {
      // Act
      const result = await reporter.runWithTelemetryGeneric(
        testEventName,
        async (ctx: TelemetryContext) => {
          ctx.properties["ctxProperty"] = "ctxProperty";
          ctx.measurements["ctxMeasurement"] = 42;
          return "test result";
        },
        () => undefined,
        { initialProperty: "initialProperty" }
      );

      // Assert
      chai.assert.equal(result, "test result");

      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[0].type, "event");
      chai.assert.equal(mockedEvents[0].eventName, testStartEventName);
      chai.assert.equal(mockedEvents[0].properties?.["initialProperty"], "initialProperty");

      chai.assert.equal(mockedEvents[1].type, "event");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[1].properties, {
        success: "yes",
        initialProperty: "initialProperty",
        ctxProperty: "ctxProperty",
      });
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
      chai.assert.equal(mockedEvents[1].measurements?.["ctxMeasurement"], 42);
    });

    it("custom properties on exception", async () => {
      // Act
      const error = new UserError({ name: "TestError" });
      try {
        await reporter.runWithTelemetryGeneric(
          testEventName,
          async (ctx: TelemetryContext) => {
            ctx.properties["ctxProperty"] = "ctxProperty";
            ctx.measurements["ctxMeasurement"] = 42;
            ctx.errorProps = ["myErrorMessage"];
            throw error;
          },
          () => undefined,
          { initialProperty: "initialProperty" }
        );
      } catch {}

      // Assert
      chai.assert.equal(mockedEvents.length, 2);
      chai.assert.equal(mockedEvents[0].type, "event");
      chai.assert.equal(mockedEvents[0].eventName, testStartEventName);
      chai.assert.equal(mockedEvents[0].properties?.["initialProperty"], "initialProperty");

      chai.assert.equal(mockedEvents[1].type, "error");
      chai.assert.equal(mockedEvents[1].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[1].properties, {
        success: "no",
        initialProperty: "initialProperty",
        ctxProperty: "ctxProperty",
        [LocalTelemetryReporter.PropertyDebugLastEventName]: testStartEventName,
      });
      chai.assert.deepEqual(mockedEvents[1].errorProps, ["myErrorMessage"]);
      chai.assert.isTrue(Object.keys(mockedEvents[1].measurements || {}).includes("duration"));
      chai.assert.equal(mockedEvents[1].measurements?.["ctxMeasurement"], 42);
    });
  });

  describe("sendTelemetryEvent", () => {
    it("happy path", async () => {
      // Act
      reporter.sendTelemetryEvent(testEventName, { property1: "property1" }, { duration: 1 });

      // Assert
      chai.assert.equal(mockedEvents[0].eventName, testEventName);
      chai.assert.deepEqual(mockedEvents[0].properties, { property1: "property1" });
      chai.assert.equal(mockedEvents[0].measurements?.["duration"], 1);
    });
  });
});
