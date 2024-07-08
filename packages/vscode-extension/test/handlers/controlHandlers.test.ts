import * as vscode from "vscode";
import * as sinon from "sinon";
import * as chai from "chai";
import * as globalVariables from "../../src/globalVariables";
import * as commonUtils from "../../src/utils/commonUtils";
import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { featureFlagManager } from "@microsoft/teamsfx-core";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import {
  openFolderHandler,
  openLifecycleTreeview,
  openSamplesHandler,
  openWelcomeHandler,
  saveTextDocumentHandler,
} from "../../src/handlers/controlHandlers";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { PanelType } from "../../src/controls/PanelType";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryUpdateAppReason,
} from "../../src/telemetry/extTelemetryEvents";

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

    it("empty args", async () => {
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

      const result = await openFolderHandler();

      chai.assert.isTrue(sendTelemetryStub.called);
      chai.assert.isTrue(result.isOk());
    });

    it("happy path", async () => {
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const openFolderInExplorerStub = sandbox.stub(commonUtils, "openFolderInExplorer");

      const result = await openFolderHandler("file://path/to/folder");

      chai.assert.isTrue(sendTelemetryStub.called);
      chai.assert.isTrue(openFolderInExplorerStub.calledOnceWith("/path/to/folder"));
      chai.assert.isTrue(result.isOk());
    });
  });

  describe("saveTextDocumentHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("non valid project", () => {
      const isValidProjectStub = sandbox
        .stub(projectSettingsHelper, "isValidProject")
        .returns(false);
      sandbox.stub(globalVariables, "workspaceUri").value({ fsPath: "/path/to/workspace" });

      saveTextDocumentHandler({ document: {} } as any);

      chai.assert.isTrue(isValidProjectStub.calledOnceWith("/path/to/workspace"));
    });

    it("manual save reason", () => {
      const isValidProjectStub = sandbox
        .stub(projectSettingsHelper, "isValidProject")
        .returns(true);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "workspaceUri").value({ fsPath: "/path/to/workspace" });

      saveTextDocumentHandler({
        document: { fileName: "/dirname/fileName" },
        reason: vscode.TextDocumentSaveReason.Manual,
      } as vscode.TextDocumentWillSaveEvent);

      chai.assert.isTrue(isValidProjectStub.calledTwice);
      chai.assert.equal(isValidProjectStub.getCall(0).args[0], "/path/to/workspace");
      chai.assert.equal(isValidProjectStub.getCall(1).args[0], "/dirname");
      chai.assert.equal(sendTelemetryEventStub.getCall(0).args[0], TelemetryEvent.UpdateTeamsApp);
      chai.assert.deepEqual(sendTelemetryEventStub.getCall(0).args[1], {
        [TelemetryProperty.UpdateTeamsAppReason]: TelemetryUpdateAppReason.Manual,
      });
    });

    it("after delay save reason", () => {
      const isValidProjectStub = sandbox
        .stub(projectSettingsHelper, "isValidProject")
        .returns(true);
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "workspaceUri").value({ fsPath: "/path/to/workspace" });

      saveTextDocumentHandler({
        document: { fileName: "/dirname/fileName" },
        reason: vscode.TextDocumentSaveReason.AfterDelay,
      } as vscode.TextDocumentWillSaveEvent);

      chai.assert.isTrue(isValidProjectStub.calledTwice);
      chai.assert.equal(isValidProjectStub.getCall(0).args[0], "/path/to/workspace");
      chai.assert.equal(isValidProjectStub.getCall(1).args[0], "/dirname");
      chai.assert.equal(sendTelemetryEventStub.getCall(0).args[0], TelemetryEvent.UpdateTeamsApp);
      chai.assert.deepEqual(sendTelemetryEventStub.getCall(0).args[1], {
        [TelemetryProperty.UpdateTeamsAppReason]: TelemetryUpdateAppReason.AfterDelay,
      });
    });

    it("focus out save reason", () => {
      const isValidProjectStub = sandbox
        .stub(projectSettingsHelper, "isValidProject")
        .callsFake((path: string | undefined) => {
          return path !== "/dirname";
        });
      const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "workspaceUri").value({ fsPath: "/path/to/workspace" });

      saveTextDocumentHandler({
        document: { fileName: "/dirname/fileName" },
        reason: vscode.TextDocumentSaveReason.FocusOut,
      } as vscode.TextDocumentWillSaveEvent);

      chai.assert.isTrue(isValidProjectStub.calledThrice);
      chai.assert.equal(isValidProjectStub.getCall(0).args[0], "/path/to/workspace");
      chai.assert.equal(isValidProjectStub.getCall(1).args[0], "/dirname");
      chai.assert.equal(isValidProjectStub.getCall(2).args[0], "/");
      chai.assert.equal(sendTelemetryEventStub.getCall(0).args[0], TelemetryEvent.UpdateTeamsApp);
      chai.assert.deepEqual(sendTelemetryEventStub.getCall(0).args[1], {
        [TelemetryProperty.UpdateTeamsAppReason]: TelemetryUpdateAppReason.FocusOut,
      });
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
