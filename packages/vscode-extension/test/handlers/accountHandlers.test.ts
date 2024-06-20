import * as vscode from "vscode";
import * as sinon from "sinon";
import * as chai from "chai";
import M365TokenInstance from "../../src/commonlib/m365Login";
import { ok } from "@microsoft/teamsfx-api";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { cmpAccountsHandler } from "../../src/handlers/accountHandlers";

describe("AccountHandlers", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("cmpAccountsHandler", async () => {
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    const M365SignOutStub = sandbox.stub(M365TokenInstance, "signout");
    sandbox
      .stub(M365TokenInstance, "getStatus")
      .resolves(ok({ status: "SignedIn", accountInfo: { upn: "test.email.com" } }));
    sandbox
      .stub(AzureAccountManager.prototype, "getStatus")
      .resolves({ status: "SignedIn", accountInfo: { upn: "test.email.com" } });
    let changeSelectionCallback: (e: readonly vscode.QuickPickItem[]) => any = () => {};
    const stubQuickPick = {
      items: [],
      onDidChangeSelection: (
        _changeSelectionCallback: (e: readonly vscode.QuickPickItem[]) => any
      ) => {
        changeSelectionCallback = _changeSelectionCallback;
        return {
          dispose: () => {},
        };
      },
      onDidHide: () => {
        return {
          dispose: () => {},
        };
      },
      show: () => {},
      hide: () => {},
      onDidAccept: () => {},
    };
    const hideStub = sandbox.stub(stubQuickPick, "hide");
    sandbox.stub(vscode.window, "createQuickPick").returns(stubQuickPick as any);
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
    sandbox.stub(vsc_ui.VS_CODE_UI, "selectOption").resolves(ok({ result: "unknown" } as any));

    await cmpAccountsHandler([]);
    changeSelectionCallback([stubQuickPick.items[1]]);

    for (const i of stubQuickPick.items) {
      await (i as any).function();
    }

    chai.assert.isTrue(showMessageStub.calledTwice);
    chai.assert.isTrue(M365SignOutStub.calledOnce);
    chai.assert.isTrue(hideStub.calledOnce);
  });
});
