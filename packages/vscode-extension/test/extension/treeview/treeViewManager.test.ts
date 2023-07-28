import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";

import { AdaptiveCardCodeLensProvider } from "../../../src/codeLensProvider";
import * as globalVariables from "../../../src/globalVariables";
import { CommandsTreeViewProvider } from "../../../src/treeview/commandsTreeViewProvider";
import treeViewManager from "../../../src/treeview/treeViewManager";
import { manifestUtils } from "@microsoft/teamsfx-core";
import { TeamsAppManifest, ok } from "@microsoft/teamsfx-api";

describe("TreeViewManager", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("registerTreeViews", () => {
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    chai.assert.isDefined(treeViewManager.getTreeView("teamsfx-accounts"));

    const lifecycleTreeView = treeViewManager.getTreeView("teamsfx-lifecycle");
    chai.assert.isDefined(lifecycleTreeView);
    chai.assert.equal((lifecycleTreeView as any).commands.length, 3);
    chai.assert.equal((lifecycleTreeView as any).commands[0].commandId, "fx-extension.provision");
  });

  it("registerTreeViews", () => {
    sandbox.stub(globalVariables, "context").value({ extensionPath: "" });
    sandbox.stub(globalVariables, "isSPFxProject").value(false);
    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    const developmentTreeview = treeViewManager.getTreeView("teamsfx-development");
    chai.assert.isDefined(developmentTreeview);
    chai.assert.equal((developmentTreeview as any).commands.length, 4);
  });

  it("setRunningCommand", () => {
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
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok({} as TeamsAppManifest));
    sandbox.stub(manifestUtils, "getCapabilities").returns(["tab"]);

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
    sandbox.stub(globalVariables, "isSPFxProject").value(false);
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok({} as TeamsAppManifest));
    sandbox.stub(manifestUtils, "getCapabilities").returns(["tab"]);

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

  it("updateTreeViewsByContent that is not teams app", async () => {
    sandbox
      .stub(AdaptiveCardCodeLensProvider, "detectedAdaptiveCards")
      .returns(Promise.resolve(false));
    sandbox.stub(manifestUtils, "readAppManifest").resolves(ok({} as TeamsAppManifest));
    sandbox.stub(manifestUtils, "getCapabilities").returns([]);

    treeViewManager.registerTreeViews({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);
    const utilityTreeviewProvider = treeViewManager.getTreeView(
      "teamsfx-utility"
    ) as CommandsTreeViewProvider;

    const commands = utilityTreeviewProvider.getCommands();
    chai.assert.equal(commands.length, 3);

    await treeViewManager.updateTreeViewsByContent();

    chai.assert.equal(commands.length, 2);
  });

  it("updateTreeViewsOnSPFxChanged", () => {
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
    treeViewManager.updateTreeViewsOnSPFxChanged();

    chai.assert.equal(commands.length, 5);
  });

  it("should detected adaptive card", async () => {
    const provider = new AdaptiveCardCodeLensProvider();
    const res = await provider.provideCodeLenses({
      getText(range?: Range): string {
        return '"$schema": "http://adaptivecards.io/schemas/adaptive-card.json",';
      },
    } as vscode.TextDocument);
    chai.assert.isNotEmpty(res);
  });

  it("adaptive card is not detected", async () => {
    const provider = new AdaptiveCardCodeLensProvider();
    const res = await provider.provideCodeLenses({
      getText(range?: Range): string {
        return "";
      },
    } as vscode.TextDocument);
    chai.assert.equal(res?.length, 0);
  });
});
