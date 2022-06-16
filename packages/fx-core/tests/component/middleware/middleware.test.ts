import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { LogLevel, ok, Platform } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import * as path from "path";
import { createContextV3 } from "../../../src/component/utils";
import { MockLogProvider, MockTelemetryReporter, MockTools } from "../../core/utils";
import { setTools } from "../../../src/core/globalVars";
import { MockAction, mockProgressHandler } from "./helper";
import sinon from "sinon";
import { TelemetryConstants } from "../../../src/component/constants";

chai.use(chaiAsPromised);

describe("Action Middleware", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  setTools(tools);

  afterEach(() => {
    sandbox.restore();
  });

  it("logger middleware", async () => {
    const context = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(__dirname, `./data/${uuid.v4()}`),
      checkerInfo: { skipNgrok: true },
    };
    const logLog = sandbox.stub(MockLogProvider.prototype, "log");
    const logTrace = sandbox.stub(MockLogProvider.prototype, "trace");
    const logInfo = sandbox.stub(MockLogProvider.prototype, "info");
    const logDebug = sandbox.stub(MockLogProvider.prototype, "debug");
    const logWarning = sandbox.stub(MockLogProvider.prototype, "warning");
    const logError = sandbox.stub(MockLogProvider.prototype, "error");
    const logFatal = sandbox.stub(MockLogProvider.prototype, "fatal");
    const mockAction = new MockAction();
    const result = await mockAction.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
    chai.assert.isTrue(
      logLog.calledWith(LogLevel.Trace, MockAction.logFormatter(MockAction.logLogMessage))
    );
    chai.assert.isTrue(logTrace.calledWith(MockAction.logFormatter(MockAction.logTraceMessage)));
    chai.assert.isTrue(logInfo.calledWith(MockAction.logFormatter(MockAction.logInfoMessage)));
    chai.assert.isTrue(logDebug.calledWith(MockAction.logFormatter(MockAction.logDebugMessage)));
    chai.assert.isTrue(
      logWarning.calledWith(MockAction.logFormatter(MockAction.logWarningMessage))
    );
    chai.assert.isTrue(logError.calledWith(MockAction.logFormatter(MockAction.logErrorMessage)));
    chai.assert.isTrue(logFatal.calledWith(MockAction.logFormatter(MockAction.logFatalMessage)));
  });

  it("happy path for progress bar", async () => {
    const context = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(__dirname, `./data/${uuid.v4()}`),
      checkerInfo: { skipNgrok: true },
    };

    sandbox.stub(context.userInteraction, "createProgressBar").returns(mockProgressHandler);
    const start = sandbox.stub(mockProgressHandler, "start");
    const next = sandbox.stub(mockProgressHandler, "next");
    const end = sandbox.stub(mockProgressHandler, "end");
    const mockAction = new MockAction();
    const result = await mockAction.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
    chai.assert.isTrue(start.called);
    chai.assert.isTrue(next.calledTwice);
    chai.assert.isTrue(end.calledWith(true));
  });

  it("throw exception for progress bar", async () => {
    const context = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(__dirname, `./data/${uuid.v4()}`),
      checkerInfo: { skipNgrok: true },
    };

    sandbox.stub(context.userInteraction, "createProgressBar").returns(mockProgressHandler);
    const end = sandbox.stub(mockProgressHandler, "end");
    const mockAction = new MockAction();
    mockAction.throwError = true;
    const result = await mockAction.execute(context, inputs);
    chai.assert.isTrue(end.calledWith(false), "end is not called with false");
  });

  it("runWithCatchError middleware", async () => {
    const context = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(__dirname, `./data/${uuid.v4()}`),
      checkerInfo: { skipNgrok: true },
    };

    const mockAction = new MockAction();
    mockAction.throwError = true;
    const result = await mockAction.execute(context, inputs);
    chai.assert.isTrue(result.isErr(), "result is not error");
  });

  it("happy path for telemetry", async () => {
    const context = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(__dirname, `./data/${uuid.v4()}`),
      checkerInfo: { skipNgrok: true },
    };

    const sendEvent = sandbox.stub(MockTelemetryReporter.prototype, "sendTelemetryEvent");

    const mockAction = new MockAction();
    const result = await mockAction.execute(context, inputs);
    chai.assert.isTrue(sendEvent.calledThrice, "send event count is not 3");
    const startEventArg = sendEvent.args[0];
    chai.assert.equal(
      startEventArg[0],
      MockAction.stage + TelemetryConstants.eventPrefix,
      "start telemetry event is not expected"
    );
    chai.assert.equal(
      startEventArg[1]![TelemetryConstants.properties.component],
      MockAction.componentName,
      "start telemetry component name is not expected"
    );

    const innerEventArg = sendEvent.args[1];
    chai.assert.equal(innerEventArg[0], "inner telemetry", "inner telemetry event is not expected");
    chai.assert.equal(
      innerEventArg[1]![TelemetryConstants.properties.component],
      MockAction.componentName,
      "inner telemetry component name is not expected"
    );

    const EndEventArg = sendEvent.args[2];
    chai.assert.equal(EndEventArg[0], MockAction.stage, "end telemetry event is not expected");
    chai.assert.equal(
      EndEventArg[1]![TelemetryConstants.properties.component],
      MockAction.componentName,
      "end telemetry component name is not expected"
    );
    chai.assert.equal(
      EndEventArg[1]![TelemetryConstants.properties.success],
      TelemetryConstants.values.yes,
      "end telemetry sucess is not expected"
    );
  });

  it("throw error for telemetry", async () => {
    const context = createContextV3();
    const inputs = {
      platform: Platform.VSCode,
      projectPath: path.resolve(__dirname, `./data/${uuid.v4()}`),
      checkerInfo: { skipNgrok: true },
    };

    const sendEvent = sandbox.stub(MockTelemetryReporter.prototype, "sendTelemetryEvent");
    const sendErrorEvent = sandbox.stub(MockTelemetryReporter.prototype, "sendTelemetryErrorEvent");

    const mockAction = new MockAction();
    mockAction.throwError = true;
    const result = await mockAction.execute(context, inputs);
    chai.assert.isTrue(sendEvent.calledTwice, "send event count is not 2");
    chai.assert.isTrue(sendErrorEvent.calledOnce, "send error event count is not 1");

    const errorEventArg = sendErrorEvent.args[0];
    chai.assert.equal(errorEventArg[0], MockAction.stage, "error telemetry event is not expected");
    chai.assert.equal(
      errorEventArg[1]![TelemetryConstants.properties.component],
      MockAction.componentName,
      "error telemetry component name is not expected"
    );
    chai.assert.equal(
      errorEventArg[1]![TelemetryConstants.properties.success],
      TelemetryConstants.values.no,
      "error telemetry sucess is not expected"
    );
    chai.assert.equal(
      errorEventArg[3]![0],
      TelemetryConstants.properties.errorMessage,
      "error telemetry error props is not expected"
    );
  });
});
