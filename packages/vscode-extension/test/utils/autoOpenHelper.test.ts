import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import fs from "fs-extra";
import * as globalVariables from "../../src/globalVariables";
import * as globalState from "@microsoft/teamsfx-core/build/common/globalState";
import * as runIconHandlers from "../../src/debug/runIconHandler";
import * as appDefinitionUtils from "../../src/utils/appDefinitionUtils";
import { ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { showLocalDebugMessage } from "../../src/utils/autoOpenHelper";

describe("autoOpenHelper", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("showLocalDebugMessage() - has local env", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(true);
    const runLocalDebug = sandbox.stub(runIconHandlers, "selectAndDebug").resolves(ok(null));

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Debug",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );

    await showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.calledOnce);
    chai.assert.isTrue(runLocalDebug.called);
  });

  it("showLocalDebugMessage() - local env and non windows", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("linux");
    sandbox.stub(fs, "pathExists").resolves(true);
    const runLocalDebug = sandbox.stub(runIconHandlers, "selectAndDebug").resolves(ok(null));

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Not Debug",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );

    await showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.calledOnce);
    chai.assert.isFalse(runLocalDebug.called);
  });

  it("showLocalDebugMessage() - has local env and not click debug", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(true);
    const runLocalDebug = sandbox.stub(runIconHandlers, "selectAndDebug").resolves(ok(null));

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve(undefined);
        }
      );

    await showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.calledOnce);
    chai.assert.isFalse(runLocalDebug.called);
  });

  it("showLocalDebugMessage() - no local env", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(false);

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Provision",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.called);
    chai.assert.isTrue(executeCommandStub.called);
  });

  it("showLocalDebugMessage() - no local env and non windows", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(appDefinitionUtils, "getAppName").resolves("");
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("linux");
    sandbox.stub(fs, "pathExists").resolves(false);

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Not provision",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.called);
    chai.assert.isTrue(executeCommandStub.notCalled);
  });

  it("showLocalDebugMessage() - no local env and not click provision", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(false);

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve(undefined);
        }
      );
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.called);
    chai.assert.isFalse(executeCommandStub.called);
  });
});
