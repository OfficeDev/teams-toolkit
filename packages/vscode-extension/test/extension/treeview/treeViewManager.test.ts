import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import * as commonTools from "@microsoft/teamsfx-core/build/common/tools";

import { AdaptiveCardCodeLensProvider } from "../../../src/codeLensProvider";
import { TreatmentVariableValue } from "../../../src/exp/treatmentVariables";
import * as globalVariables from "../../../src/globalVariables";
import { CommandsTreeViewProvider } from "../../../src/treeview/commandsTreeViewProvider";
import treeViewManager from "../../../src/treeview/treeViewManager";

describe("TreeViewManager", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("registerTreeViews", async () => {
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    chai.assert.isDefined(treeViewManager.getTreeView("teamsfx-accounts"));

    const lifecycleTreeView = treeViewManager.getTreeView("teamsfx-lifecycle");
    chai.assert.isDefined(lifecycleTreeView);
    chai.assert.equal(lifecycleTreeView.commands.length, 3);
    chai.assert.equal(lifecycleTreeView.commands[0].commandId, "fx-extension.provision");
  });

  it("registerTreeViews in v3", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox.stub(globalVariables, "context").value({ extensionPath: "" });
    sandbox.stub(globalVariables, "isSPFxProject").value(false);
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    const developmentTreeview = treeViewManager.getTreeView("teamsfx-development");
    chai.assert.isDefined(developmentTreeview);
    chai.assert.equal(developmentTreeview.commands.length, 4);
  });

  it("setRunningCommand", async () => {
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const command = (treeViewManager as any).commandMap.get("fx-extension.create");
    const setStatusStub = sinon.stub(command, "setStatus");
    treeViewManager.setRunningCommand("fx-extension.create", ["fx-extension.openSamples"]);

    chai.assert.equal(setStatusStub.callCount, 1);

    treeViewManager.restoreRunningCommand(["fx-extension.openSamples"]);
    chai.assert.equal(setStatusStub.callCount, 2);
  });

  it("updateTreeViewsByContent has adaptive cards", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(false);
    sandbox
      .stub(AdaptiveCardCodeLensProvider, "detectedAdaptiveCards")
      .returns(Promise.resolve(true));

    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const utilityTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-utility"
    ) as CommandsTreeViewProvider;

    const commands = utilityTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 3);

    await treeViewManager.updateTreeViewsByContent();

    chai.assert.equal(commands.length, 4);
  });

  it("updateTreeViewsByContent that removes project related commands", async () => {
    sandbox
      .stub(AdaptiveCardCodeLensProvider, "detectedAdaptiveCards")
      .returns(Promise.resolve(true));
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox.stub(globalVariables, "isSPFxProject").value(false);

    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const developmentTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-development"
    ) as CommandsTreeViewProvider;

    const commands = developmentTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 4);

    await treeViewManager.updateTreeViewsByContent(true);

    chai.assert.equal(commands.length, 3);
  });

  it("updateTreeViewsOnSPFxChanged", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox.stub(globalVariables, "isSPFxProject").value(false);
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const developmentTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-development"
    ) as CommandsTreeViewProvider;

    const commands = developmentTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 4);

    sandbox.stub(globalVariables, "isSPFxProject").value(true);
    await treeViewManager.updateTreeViewsOnSPFxChanged();

    chai.assert.equal(commands.length, 5);
  });
});
