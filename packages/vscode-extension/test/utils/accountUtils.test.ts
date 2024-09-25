import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { signOutM365, signOutAzure, signInAzure, signInM365 } from "../../src/utils/accountUtils";
import envTreeProviderInstance from "../../src/treeview/environmentTreeViewProvider";
import M365TokenInstance from "../../src/commonlib/m365Login";

describe("accountUtils", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("signInAzure()", async () => {
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await signInAzure();

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  it("signInM365()", async () => {
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await signInM365();

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  it("signOutM365", async () => {
    const signOut = sandbox.stub(M365TokenInstance, "signout").resolves(true);
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(envTreeProviderInstance, "reloadEnvironments");

    await signOutM365(false);

    sandbox.assert.calledOnce(signOut);
  });

  it("signOutAzure", async () => {
    Object.setPrototypeOf(AzureAccountManager, sandbox.stub());
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await signOutAzure(false);

    sandbox.assert.calledOnce(showMessageStub);
  });
});
