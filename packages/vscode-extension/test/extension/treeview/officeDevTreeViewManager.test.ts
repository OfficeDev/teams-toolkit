import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import officeDevTreeViewManager from "../../../src/treeview/officeDevTreeViewManager";

describe("OfficeDevTreeViewManager", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("registerOfficeDevTreeViews", () => {
    officeDevTreeViewManager.registerOfficeDevTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    const developmentTreeview = officeDevTreeViewManager.getTreeView(
      "teamsfx-officedev-development"
    );
    chai.assert.isDefined(developmentTreeview);
    chai.assert.equal((developmentTreeview as any).commands.length, 5);

    const lifeCycleTreeview = officeDevTreeViewManager.getTreeView("teamsfx-officedev-lifecycle");
    chai.assert.isDefined(lifeCycleTreeview);
    chai.assert.equal((lifeCycleTreeview as any).commands.length, 2);

    const utilityTreeView = officeDevTreeViewManager.getTreeView("teamsfx-officedev-utility");
    chai.assert.isDefined(utilityTreeView);
    chai.assert.equal((utilityTreeView as any).commands.length, 2);

    const helpAndFeedbackTreeView = officeDevTreeViewManager.getTreeView(
      "teamsfx-officedev-help-and-feedback"
    );
    chai.assert.isDefined(helpAndFeedbackTreeView);
    chai.assert.equal((helpAndFeedbackTreeView as any).commands.length, 4);
  });
});
