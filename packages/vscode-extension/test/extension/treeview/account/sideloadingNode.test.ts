import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import * as tools from "@microsoft/teamsfx-core/build/common/tools";

import { errorIcon, infoIcon, passIcon } from "../../../../src/treeview/account/common";
import { SideloadingNode } from "../../../../src/treeview/account/sideloadingNode";
import { DynamicNode } from "../../../../src/treeview/dynamicNode";
import * as handlers from "../../../../src/handlers";

describe("sideloadingNode", () => {
  const sandbox = sinon.createSandbox();
  const eventEmitter = new vscode.EventEmitter<DynamicNode | undefined | void>();

  afterEach(() => {
    sandbox.restore();
  });

  it("getTreeItem with empty string", async () => {
    const sideloadingNode = new SideloadingNode(eventEmitter, "");
    const treeItem = await sideloadingNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, infoIcon);
  });

  it("getTreeItem with invalid token", async () => {
    sandbox.stub(tools, "getSideloadingStatus").returns(Promise.resolve(false));
    sandbox.stub(handlers, "checkSideloadingCallback");
    const sideloadingNode = new SideloadingNode(eventEmitter, "token");
    const treeItem = await sideloadingNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, errorIcon);
  });

  it("getTreeItem with valid token", async () => {
    sandbox.stub(tools, "getSideloadingStatus").returns(Promise.resolve(true));
    const sideloadingNode = new SideloadingNode(eventEmitter, "token");
    const treeItem = await sideloadingNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, passIcon);
  });

  it("getChildren", () => {
    const sideloadingNode = new SideloadingNode(eventEmitter, "token");
    chai.assert.isNull(sideloadingNode.getChildren());
  });
});
