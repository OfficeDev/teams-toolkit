import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

import { infoIcon, keyIcon, warningIcon } from "../../../../src/treeview/account/common";
import { DynamicNode } from "../../../../src/treeview/dynamicNode";
import { SubscriptionNode } from "../../../../src/treeview/account/subscriptionNode";

describe("subscriptionNode", () => {
  const sandbox = sinon.createSandbox();
  const eventEmitter = new vscode.EventEmitter<DynamicNode | undefined | void>();
  const subscriptionNode = new SubscriptionNode(eventEmitter);

  afterEach(() => {
    sandbox.restore();
  });

  it("empty subscription", async () => {
    sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    subscriptionNode.setEmptySubscription();
    const treeItem = await subscriptionNode.getTreeItem();

    chai.assert.equal(treeItem.contextValue, "emptySubscription");
    chai.assert.equal(treeItem.iconPath, warningIcon);
  });

  it("setSubscription", async () => {
    await subscriptionNode.setSubscription({
      subscriptionName: "subscriptionName",
      subscriptionId: "subscriptionId",
      tenantId: "tenantId",
    });
    const treeItem = await subscriptionNode.getTreeItem();

    chai.assert.equal(treeItem.label, "subscriptionName");
    chai.assert.equal(treeItem.tooltip, "subscriptionName");
    chai.assert.equal(treeItem.contextValue, "selectSubscription");
    chai.assert.equal(treeItem.iconPath, keyIcon);
  });

  it("unsetSubscription", async () => {
    await subscriptionNode.unsetSubscription(2);
    const treeItem = await subscriptionNode.getTreeItem();

    chai.assert.equal(treeItem.tooltip, undefined);
    chai.assert.equal(treeItem.contextValue, "selectSubscription");
    chai.assert.equal(treeItem.iconPath, infoIcon);
  });
});
