import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { M365AccountNode } from "../../../../src/treeview/account/m365Node";
import { AccountItemStatus, loadingIcon, m365Icon } from "../../../../src/treeview/account/common";
import { DynamicNode } from "../../../../src/treeview/dynamicNode";

describe("m365Node", () => {
  const sandbox = sinon.createSandbox();
  const eventEmitter = new vscode.EventEmitter<DynamicNode | undefined | void>();

  afterEach(() => {
    sandbox.restore();
  });

  it("setSignedIn", async () => {
    const m365Node = new M365AccountNode(eventEmitter);
    await m365Node.setSignedIn("test upn");
    const treeItem = await m365Node.getTreeItem();

    chai.assert.equal(treeItem.iconPath, m365Icon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    chai.assert.equal(treeItem.label, "test upn");
    chai.assert.equal(treeItem.contextValue, "signedinM365");
    chai.assert.equal(treeItem.command, undefined);
  });

  it("setSigningIn", async () => {
    const m365Node = new M365AccountNode(eventEmitter);
    m365Node.setSigningIn();
    const treeItem = await m365Node.getTreeItem();

    chai.assert.equal(treeItem.iconPath, loadingIcon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    chai.assert.equal(treeItem.contextValue, "");
  });

  it("setSignedOut", async () => {
    const m365Node = new M365AccountNode(eventEmitter);
    m365Node.status = AccountItemStatus.SignedIn;
    await m365Node.setSignedOut();
    const treeItem = await m365Node.getTreeItem();

    chai.assert.equal(treeItem.iconPath, m365Icon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    chai.assert.equal(treeItem.contextValue, "signinM365");
  });

  it("setSwitching", async () => {
    const m365Node = new M365AccountNode(eventEmitter);
    m365Node.setSwitching();
    const treeItem = await m365Node.getTreeItem();

    chai.assert.equal(treeItem.iconPath, loadingIcon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    chai.assert.equal(treeItem.contextValue, "");
  });
});
