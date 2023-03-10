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

    const deploymentTreeView = treeViewManager.getTreeView("teamsfx-deployment");
    chai.assert.isDefined(deploymentTreeView);
    chai.assert.equal(deploymentTreeView.commands.length, 5);
    chai.assert.equal(deploymentTreeView.commands[3].commandId, "fx-extension.build");
  });

  it("registerTreeViews in v3", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox.stub(globalVariables, "context").value({ extensionPath: "" });
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    const developmentTreeview = treeViewManager.getTreeView("teamsfx-development");
    chai.assert.isDefined(developmentTreeview);
    chai.assert.equal(developmentTreeview.commands.length, 5);
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
    sandbox
      .stub(AdaptiveCardCodeLensProvider, "detectedAdaptiveCards")
      .returns(Promise.resolve(true));

    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const developmentTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-development"
    ) as CommandsTreeViewProvider;

    const commands = developmentTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 6);

    await treeViewManager.updateTreeViewsByContent();

    chai.assert.equal(commands.length, 7);
  });

  it("updateTreeViewsByContent that removes project related commands", async () => {
    sandbox
      .stub(AdaptiveCardCodeLensProvider, "detectedAdaptiveCards")
      .returns(Promise.resolve(true));

    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const developmentTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-development"
    ) as CommandsTreeViewProvider;

    const commands = developmentTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 6);

    await treeViewManager.updateTreeViewsByContent(true);

    chai.assert.equal(commands.length, 3);
  });
});
