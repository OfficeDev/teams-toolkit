import * as sinon from "sinon";
import * as chai from "chai";
import * as vscode from "vscode";
import * as globalVariables from "../../src/globalVariables";
import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { activate } from "../../src/handlers/activate";
import { ok } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import commandController from "../../src/commandController";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import accountTreeViewProviderInstance from "../../src/treeview/account/accountTreeViewProvider";
import TreeViewManagerInstance from "../../src/treeview/treeViewManager";
import M365TokenInstance from "../../src/commonlib/m365Login";

describe("activate()", function () {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(accountTreeViewProviderInstance, "subscribeToStatusChanges");
    sandbox.stub(vscode.extensions, "getExtension").returns(undefined);
    sandbox.stub(TreeViewManagerInstance, "getTreeView").returns(undefined);
    sandbox.stub(ExtTelemetry, "dispose");
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("No globalState error", async () => {
    const result = await activate();
    chai.assert.deepEqual(result.isOk() ? result.value : result.error.name, {});
  });

  it("Valid project", async () => {
    sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const addSharedPropertyStub = sandbox.stub(ExtTelemetry, "addSharedProperty");
    const setCommandIsRunningStub = sandbox.stub(globalVariables, "setCommandIsRunning");
    const lockedByOperationStub = sandbox.stub(commandController, "lockedByOperation");
    const unlockedByOperationStub = sandbox.stub(commandController, "unlockedByOperation");
    const azureAccountSetStatusChangeMapStub = sandbox.stub(
      AzureAccountManager.prototype,
      "setStatusChangeMap"
    );
    const m365AccountSetStatusChangeMapStub = sandbox.stub(M365TokenInstance, "setStatusChangeMap");
    const showMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
    let lockCallback: any;
    let unlockCallback: any;

    sandbox.stub(FxCore.prototype, "on").callsFake((event: string, callback: any) => {
      if (event === "lock") {
        lockCallback = callback;
      } else {
        unlockCallback = callback;
      }
    });
    azureAccountSetStatusChangeMapStub.callsFake(
      (
        name: string,
        statusChange: (
          status: string,
          token?: string,
          accountInfo?: Record<string, unknown>
        ) => Promise<void>
      ) => {
        statusChange(signedIn).then(() => {});
        statusChange(signedOut).then(() => {});
        return Promise.resolve(true);
      }
    );
    m365AccountSetStatusChangeMapStub.callsFake(
      (
        name: string,
        tokenRequest: unknown,
        statusChange: (
          status: string,
          token?: string,
          accountInfo?: Record<string, unknown>
        ) => Promise<void>
      ) => {
        statusChange(signedIn).then(() => {});
        statusChange(signedOut).then(() => {});
        return Promise.resolve(ok(true));
      }
    );
    const result = await activate();

    chai.assert.isTrue(addSharedPropertyStub.called);
    chai.assert.isTrue(sendTelemetryStub.calledOnceWith("open-teams-app"));
    chai.assert.deepEqual(result.isOk() ? result.value : result.error.name, {});

    lockCallback("test");
    setCommandIsRunningStub.calledOnceWith(true);
    lockedByOperationStub.calledOnceWith("test");

    unlockCallback("test");
    unlockedByOperationStub.calledOnceWith("test");

    chai.assert.isTrue(showMessageStub.called);
  });

  it("throws error", async () => {
    sandbox.stub(projectSettingsHelper, "isValidProject").returns(false);
    sandbox.stub(M365TokenInstance, "setStatusChangeMap");
    sandbox.stub(FxCore.prototype, "on").throws(new Error("test"));
    const showErrorMessageStub = sandbox.stub(vscode.window, "showErrorMessage");

    const result = await activate();

    chai.assert.isTrue(result.isErr());
    chai.assert.isTrue(showErrorMessageStub.called);
  });
});
