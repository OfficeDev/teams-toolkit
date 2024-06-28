import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import * as globalVariables from "../../src/globalVariables";
import * as launch from "../../src/debug/launch";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as systemEnvUtils from "../../src/utils/systemEnvUtils";
import { debugInTestToolHandler, treeViewPreviewHandler } from "../../src/handlers/debugHandlers";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { MockCore } from "../mocks/mockCore";
import { Inputs, err, ok } from "@microsoft/teamsfx-api";

describe("DebugHandlers", () => {
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

  describe("TreeViewPreviewHandler", function () {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("treeViewPreviewHandler() - previewWithManifest error", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox
        .stub(globalVariables.core, "previewWithManifest")
        .resolves(err({ foo: "bar" } as any));

      const result = await treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isErr());
    });

    it("treeViewPreviewHandler() - happy path", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(globalVariables.core, "previewWithManifest").resolves(ok("test-url"));
      sandbox.stub(launch, "openHubWebClient").resolves();

      const result = await treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isOk());
    });
  });
});
