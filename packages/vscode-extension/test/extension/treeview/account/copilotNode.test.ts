import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { Ok } from "@microsoft/teamsfx-api";
import * as tools from "@microsoft/teamsfx-core/build/common/tools";

import M365TokenInstance from "../../../../src/commonlib/m365Login";
import { infoIcon, passIcon, warningIcon } from "../../../../src/treeview/account/common";
import { CopilotNode } from "../../../../src/treeview/account/copilotNode";
import { DynamicNode } from "../../../../src/treeview/dynamicNode";
import * as handlers from "../../../../src/handlers";

describe("sideloadingNode", () => {
  const sandbox = sinon.createSandbox();
  const eventEmitter = new vscode.EventEmitter<DynamicNode | undefined | void>();

  afterEach(() => {
    sandbox.restore();
  });

  it("getTreeItem with empty string", async () => {
    const copilotNode = new CopilotNode(eventEmitter, "");
    const treeItem = await copilotNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, infoIcon);
  });

  it("getTreeItem with check false", async () => {
    sandbox
      .stub(M365TokenInstance, "getAccessToken")
      .returns(Promise.resolve(new Ok("test-token")));
    sandbox.stub(tools, "getCopilotStatus").returns(Promise.resolve(false));
    sandbox.stub(handlers, "checkCopilotCallback");
    const copilotNode = new CopilotNode(eventEmitter, "token");
    const treeItem = await copilotNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, warningIcon);
  });

  it("getTreeItem with check true", async () => {
    sandbox
      .stub(M365TokenInstance, "getAccessToken")
      .returns(Promise.resolve(new Ok("test-token")));
    sandbox.stub(tools, "getCopilotStatus").returns(Promise.resolve(true));
    const copilotNode = new CopilotNode(eventEmitter, "token");
    const treeItem = await copilotNode.getTreeItem();

    chai.assert.equal(treeItem.iconPath, passIcon);
  });

  it("getChildren", () => {
    const copilotNode = new CopilotNode(eventEmitter, "token");
    chai.assert.isNull(copilotNode.getChildren());
  });
});
