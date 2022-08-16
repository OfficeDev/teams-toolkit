import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { SubscriptionInfo } from "@microsoft/teamsfx-api";

import { AzureAccountManager } from "../../../../src/commonlib/azureLogin";
import { AzureAccountNode } from "../../../../src/treeview/account/azureNode";
import { AccountItemStatus, azureIcon, loadingIcon } from "../../../../src/treeview/account/common";
import { DynamicNode } from "../../../../src/treeview/dynamicNode";

describe("AzureNode", () => {
  const sandbox = sinon.createSandbox();
  const eventEmitter = new vscode.EventEmitter<DynamicNode | undefined | void>();

  before(() => {
    Object.setPrototypeOf(AzureAccountManager, sandbox.stub());
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("setSignedIn", async () => {
    sandbox.stub(AzureAccountManager.getInstance(), "getSelectedSubscription").returns(
      Promise.resolve({
        subscriptionId: "subscriptionId",
        subscriptionName: "subscriptionName",
      } as SubscriptionInfo)
    );
    const setSubscriptionStub = sandbox.stub(AzureAccountManager.getInstance(), "setSubscription");
    sandbox.stub(AzureAccountManager.getInstance(), "listSubscriptions").returns(
      Promise.resolve([
        {
          subscriptionId: "subscriptionId",
          subscriptionName: "subscriptionName",
        } as SubscriptionInfo,
      ])
    );

    const azureNode = new AzureAccountNode(eventEmitter);
    await azureNode.setSignedIn("test upn");
    const treeItem = await azureNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, azureIcon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
    chai.assert.equal(treeItem.label, "test upn");
    chai.assert.equal(treeItem.contextValue, "signedinAzure");
    chai.assert.equal(treeItem.command, undefined);

    chai.assert.equal(setSubscriptionStub.callCount, 1);
  });

  it("setSigningIn", async () => {
    const azureNode = new AzureAccountNode(eventEmitter);
    azureNode.setSigningIn();
    const treeItem = await azureNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, loadingIcon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    chai.assert.equal(treeItem.contextValue, "");
  });

  it("setSignedOut", async () => {
    const azureNode = new AzureAccountNode(eventEmitter);
    azureNode.status = AccountItemStatus.SignedIn;
    await azureNode.setSignedOut();
    const treeItem = await azureNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, azureIcon);
    chai.assert.equal(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    chai.assert.equal(treeItem.contextValue, "signinAzure");
  });
});
