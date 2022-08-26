import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import treeViewManager from "../../../src/treeview/treeViewManager";
import { AdaptiveCardCodeLensProvider } from "../../../src/codeLensProvider";
import { CommandsTreeViewProvider } from "../../../src/treeview/commandsTreeViewProvider";
import { TreatmentVariableValue } from "../../../src/exp/treatmentVariables";

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

  it("updateTreeViewsByContent", async () => {
    sandbox
      .stub(AdaptiveCardCodeLensProvider, "detectedAdaptiveCards")
      .returns(Promise.resolve(true));
    sandbox.stub(TreatmentVariableValue, "previewTreeViewCommand").value(true);

    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const developmentTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-development"
    ) as CommandsTreeViewProvider;

    const commands = developmentTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 4);

    await treeViewManager.updateTreeViewsByContent();

    chai.assert.equal(commands.length, 6);
  });
});
