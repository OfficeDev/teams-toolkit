import * as chai from "chai";
import * as spies from "chai-spies";
import { Stage, UserError } from "@microsoft/teamsfx-api";
import * as ExtTelemetry from "../../src/telemetry/telemetry";
import {
  TelemetryEvent,
  TelemetryEventCache,
  TelemetryProperty,
} from "../../src/telemetry/extTelemetryEvents";
import sinon = require("sinon");
import * as commonUtils from "../../src/utils/commonUtils";
import * as fs from "fs-extra";
import * as globalVariables from "../../src/globalVariables";
import { Uri } from "vscode";

chai.use(spies);
const spy = chai.spy;

const reporterSpy = spy.interface({
  sendTelemetryErrorEvent(
    eventName: string,
    properties?: { [p: string]: string },
    measurements?: { [p: string]: number },
    errorProps?: string[]
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
  dispose(): Promise<void> {
    return Promise.resolve();
  },
});
const cacheSpy = spy.interface({
  persistUnsentEventsToDiskAsync(event: TelemetryEventCache): Promise<void> {
    return Promise.resolve();
  },
});

describe("ExtTelemetry", () => {
  describe("stageToEvent", () => {
    it("Stage.create", () => {
      const stage = Stage.create;
      chai.expect(ExtTelemetry.stageToEvent(stage)).equals(TelemetryEvent.CreateProject);
    });

    it("Stage.provision", () => {
      const stage = Stage.provision;
      chai.expect(ExtTelemetry.stageToEvent(stage)).equals(TelemetryEvent.Provision);
    });

    it("Stage.deploy", () => {
      const stage = Stage.deploy;
      chai.expect(ExtTelemetry.stageToEvent(stage)).equals(TelemetryEvent.Deploy);
    });

    it("Stage.publish", () => {
      const stage = Stage.publish;
      chai.expect(ExtTelemetry.stageToEvent(stage)).equals(TelemetryEvent.Publish);
    });

    it("Stage.creatEnv", () => {
      const stage = Stage.createEnv;
      chai.expect(ExtTelemetry.stageToEvent(stage)).equals(TelemetryEvent.CreateNewEnvironment);
    });

    it("unknown", () => {
      const stage = "unknown";
      chai.expect(ExtTelemetry.stageToEvent(stage as Stage)).equals(undefined);
    });
  });

  describe("Send Telemetry", () => {
    const sandbox = sinon.createSandbox();
    before(() => {
      chai.util.addProperty(ExtTelemetry, "reporter", () => reporterSpy);
      sandbox.stub(fs, "pathExistsSync").returns(false);
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(globalVariables, "isSPFxProject").value(false);
      sandbox.stub(globalVariables, "isExistingUser").value("no");
    });

    after(() => {
      sandbox.restore();
    });

    it("sendTelemetryEvent", () => {
      ExtTelemetry.sendTelemetryEvent(
        "sampleEvent",
        { stringProp: "some string" },
        { numericMeasure: 123 }
      );

      chai.expect(reporterSpy.sendTelemetryEvent).to.have.been.called.with(
        "sampleEvent",
        {
          stringProp: "some string",
          component: "extension",
          "is-existing-user": "no",
          "is-spfx": "false",
        },
        { numericMeasure: 123 }
      );
    });

    it("sendTelemetryErrorEvent", () => {
      const error = new UserError(
        "test",
        "UserTestError",
        "test error message",
        "displayed test error message"
      );
      ExtTelemetry.sendTelemetryErrorEvent(
        "sampleEvent",
        error,
        { stringProp: "some string" },
        { numericMeasure: 123 },
        ["errorProps"]
      );

      chai.expect(reporterSpy.sendTelemetryErrorEvent).to.have.been.called.with(
        "sampleEvent",
        {
          stringProp: "some string",
          component: "extension",
          success: "no",
          "is-existing-user": "no",
          "is-spfx": "false",
          "error-type": "user",
          "error-message": `${error.message}${error.stack ? "\nstack:\n" + error.stack : ""}`,
          "error-code": "test.UserTestError",
        },
        { numericMeasure: 123 },
        ["errorProps"]
      );

      chai.expect(reporterSpy.sendTelemetryErrorEvent).to.not.have.been.called.with(
        "sampleEvent",
        {
          stringProp: "some string",
          component: "extension",
          success: "no",
          "is-existing-user": "no",
          "is-spfx": "false",
          "error-type": "user",
          "error-message": `${error.displayMessage}${
            error.stack ? "\nstack:\n" + error.stack : ""
          }`,
          "error-code": "test.UserTestError",
        },
        { numericMeasure: 123 },
        ["errorProps"]
      );
    });

    it("sendTelemetryException", () => {
      const error = new UserError("test", "UserTestError", "test error message");
      ExtTelemetry.sendTelemetryException(
        error,
        { stringProp: "some string" },
        { numericMeasure: 123 }
      );

      chai.expect(reporterSpy.sendTelemetryException).to.have.been.called.with(
        error,
        {
          stringProp: "some string",
          component: "extension",
          "is-existing-user": "no",
          "is-spfx": "false",
        },
        { numericMeasure: 123 }
      );
    });
  });

  describe("deactivate event", () => {
    it("telemetry dispose", async () => {
      const clock = sinon.useFakeTimers();
      sinon.stub(ExtTelemetry, "lastCorrelationId").value("correlation-id");
      chai.util.addProperty(ExtTelemetry, "cache", () => cacheSpy);
      sinon.stub(commonUtils, "getProjectId").returns("project-id");

      await ExtTelemetry.dispose();

      chai.expect(cacheSpy.persistUnsentEventsToDiskAsync).to.have.been.called.with({
        type: "normal",
        occurTime: new clock.Date(),
        eventName: TelemetryEvent.Deactivate,
        properties: {
          [TelemetryProperty.CorrelationId]: "correlation-id",
          [TelemetryProperty.ProjectId]: "project-id",
        },
      });

      clock.restore();
      sinon.restore();
    });
  });
});
