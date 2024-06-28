import * as vscode from "vscode";
import * as sinon from "sinon";
import * as chai from "chai";
import * as globalVariables from "../../src/globalVariables";
import { featureFlagManager } from "@microsoft/teamsfx-core";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import {
  openFolderHandler,
  openLifecycleTreeview,
  openSamplesHandler,
  openWelcomeHandler,
} from "../../src/handlers/controlHandlers";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { PanelType } from "../../src/controls/PanelType";

describe("Control Handlers", () => {
  describe("openWelcomeHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("openWelcomeHandler", async () => {
      sandbox.stub(featureFlagManager, "getBooleanValue").returns(false);
      const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

      await openWelcomeHandler();

      sandbox.assert.calledOnceWithExactly(
        executeCommands,
        "workbench.action.openWalkthrough",
        "TeamsDevApp.ms-teams-vscode-extension#teamsToolkitGetStarted"
      );
    });

    it("openWelcomeHandler with chat", async () => {
      sandbox.stub(featureFlagManager, "getBooleanValue").returns(true);
      const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

      await openWelcomeHandler();

      sandbox.assert.calledOnceWithExactly(
        executeCommands,
        "workbench.action.openWalkthrough",
        "TeamsDevApp.ms-teams-vscode-extension#teamsToolkitGetStartedWithChat"
      );
    });
  });

  describe("openSamplesHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("openSamplesHandler", async () => {
      const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

      await openSamplesHandler();

      sandbox.assert.calledOnceWithExactly(createOrShow, PanelType.SampleGallery, []);
    });
  });

  describe("openFolderHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("openFolderHandler()", async () => {
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await openFolderHandler();

      chai.assert.isTrue(sendTelemetryStub.called);
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("openLifecycleTreeview", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("TeamsFx Project", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

      await openLifecycleTreeview();

      chai.assert.isTrue(executeCommandStub.calledWith("teamsfx-lifecycle.focus"));
    });

    it("non-TeamsFx Project", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

      await openLifecycleTreeview();

      chai.assert.isTrue(executeCommandStub.calledWith("workbench.view.extension.teamsfx"));
    });
  });
});
