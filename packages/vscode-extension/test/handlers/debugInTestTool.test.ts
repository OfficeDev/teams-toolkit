import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import * as globalVariables from "../../src/globalVariables";
import { debugInTestToolHandler } from "../../src/handlers/debugInTestTool";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { MockCore } from "../mocks/mockCore";

describe("DebugInTestTool", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  it("treeViewDebugInTestToolHandler", async () => {
    sandbox.stub(globalVariables, "core").value(new MockCore());
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await debugInTestToolHandler("treeview")();

    chai.assert.isTrue(
      executeCommandStub.calledOnceWith("workbench.action.quickOpen", "debug Debug in Test Tool")
    );
  });

  it("messageDebugInTestToolHandler", async () => {
    sandbox.stub(globalVariables, "core").value(new MockCore());
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await debugInTestToolHandler("message")();

    chai.assert.isTrue(
      executeCommandStub.calledOnceWith("workbench.action.quickOpen", "debug Debug in Test Tool")
    );
  });
});
