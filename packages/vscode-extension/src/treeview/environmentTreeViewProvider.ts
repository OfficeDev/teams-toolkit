// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Mutex } from "async-mutex";
import * as vscode from "vscode";

import { err, FxError, LocalEnvironmentName, ok, Result, Void } from "@microsoft/teamsfx-api";
import { environmentManager, isValidProject } from "@microsoft/teamsfx-core";

import * as globalVariables from "../globalVariables";
import { DynamicNode } from "./dynamicNode";
import { EnvironmentNode } from "./environmentTreeItem";

export class EnvironmentTreeViewProvider implements vscode.TreeDataProvider<DynamicNode> {
  private static instance: EnvironmentTreeViewProvider;
  private _onDidChangeTreeData: vscode.EventEmitter<DynamicNode | undefined | void> =
    new vscode.EventEmitter<DynamicNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<DynamicNode | undefined | void> =
    this._onDidChangeTreeData.event;

  private environments: DynamicNode[] = [];
  private mutex = new Mutex();

  private constructor() {}

  public static getInstance() {
    if (!EnvironmentTreeViewProvider.instance) {
      EnvironmentTreeViewProvider.instance = new EnvironmentTreeViewProvider();
    }
    return EnvironmentTreeViewProvider.instance;
  }

  public async reloadEnvironments(): Promise<Result<Void, FxError>> {
    if (!globalVariables.workspaceUri || !isValidProject(globalVariables.workspaceUri.fsPath)) {
      return ok(Void);
    }
    const workspacePath: string = globalVariables.workspaceUri.fsPath;
    return await this.mutex.runExclusive(async () => {
      const envNamesResult = await environmentManager.listRemoteEnvConfigs(workspacePath);
      if (envNamesResult.isErr()) {
        return err(envNamesResult.error);
      }

      const envNames = [LocalEnvironmentName].concat(envNamesResult.value);
      this.environments = envNames.map((env) => new EnvironmentNode(env));
      this._onDidChangeTreeData.fire();
      return ok(Void);
    });
  }

  public refreshRemoteEnvWarning() {
    // TODO: remove the dependency of child number.
    // Reload the whole treeview because collapsible state need to be recalculated.
    this.reloadEnvironments();

    // for (const node of this.environments) {
    //   const envNode = node as EnvironmentNode;
    //   if (envNode?.identifier !== LocalEnvironmentName) {
    //     this._onDidChangeTreeData.fire(envNode);
    //   }
    // }
  }

  public getTreeItem(element: DynamicNode): Thenable<vscode.TreeItem> | vscode.TreeItem {
    return element.getTreeItem();
  }

  public getChildren(element?: DynamicNode): Thenable<DynamicNode[] | undefined | null> {
    if (!element) {
      return Promise.resolve(this.environments);
    }
    return element.getChildren();
  }
}

export default EnvironmentTreeViewProvider.getInstance();
