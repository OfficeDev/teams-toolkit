import * as vscode from "vscode";
import * as sinon from "sinon";
import fs from "fs-extra";
import * as chai from "chai";
import * as globalVariables from "../../src/globalVariables";
import * as extTelemetryEvents from "../../src/telemetry/extTelemetryEvents";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { PanelType } from "../../src/controls/PanelType";
import { TreatmentVariableValue } from "../../src/exp/treatmentVariables";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import { openReadMeHandler, openSampleReadmeHandler } from "../../src/handlers/readmeHandlers";

describe("readmeHandlers", () => {
  describe("openReadMeHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("Happy Path", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
      const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "readmeTestFolder" } }]);
      sandbox.stub(fs, "pathExists").resolves(true);
      const openTextDocumentStub = sandbox
        .stub(vscode.workspace, "openTextDocument")
        .resolves({} as any as vscode.TextDocument);

      await openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

      chai.assert.isTrue(openTextDocumentStub.calledOnce);
      chai.assert.isTrue(executeCommands.calledOnce);
    });

    it("Create Project", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
      sandbox.stub(globalVariables, "core").value(undefined);
      const showMessageStub = sandbox
        .stub(vscode.window, "showInformationMessage")
        .callsFake(
          (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
            return Promise.resolve({
              title: "Yes",
              run: (options as any).run,
            } as vscode.MessageItem);
          }
        );
      await openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

      chai.assert.isTrue(showMessageStub.calledOnce);
    });

    it("Open Folder", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
      sandbox.stub(globalVariables, "core").value(undefined);
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
      const showMessageStub = sandbox
        .stub(vscode.window, "showInformationMessage")
        .callsFake(
          (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
            return Promise.resolve({
              title: "Yes",
              run: (items[0] as any).run,
            } as vscode.MessageItem);
          }
        );
      await openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

      chai.assert.isTrue(executeCommandStub.calledOnce);
    });

    it("Function Notification Bot Template", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "readmeTestFolder" } }]);
      sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox
        .stub(fs, "readFile")
        .resolves(Buffer.from("## Get Started with the Notification bot"));
      const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");

      await openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

      sandbox.assert.calledOnceWithExactly(
        createOrShow,
        PanelType.FunctionBasedNotificationBotReadme
      );
    });

    it("Restify Notification Bot Template", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
      sandbox
        .stub(vscode.workspace, "workspaceFolders")
        .value([{ uri: { fsPath: "readmeTestFolder" } }]);
      sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox
        .stub(fs, "readFile")
        .resolves(Buffer.from("## Get Started with the Notification bot restify"));
      const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");

      await openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

      sandbox.assert.calledOnceWithExactly(
        createOrShow,
        PanelType.RestifyServerNotificationBotReadme
      );
    });
  });

  describe("openSampleReadmeHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("Trigger from Walkthrough", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
      sandbox.stub(vscode.workspace, "openTextDocument");
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

      await openSampleReadmeHandler(["WalkThrough"]);

      chai.assert.isTrue(executeCommandStub.calledOnce);
    });
  });
});
