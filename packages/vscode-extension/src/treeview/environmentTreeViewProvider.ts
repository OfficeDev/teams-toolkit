// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Mutex } from "async-mutex";
import * as vscode from "vscode";

import { FxError, LocalEnvironmentName, ok, Result, Void } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import { environmentManager } from "@microsoft/teamsfx-core";

import * as globalVariables from "../globalVariables";
import { DynamicNode } from "./dynamicNode";
import { EnvironmentNode } from "./environmentTreeItem";

class EnvironmentTreeViewProvider implements vscode.TreeDataProvider<DynamicNode> {
  private static instance: EnvironmentTreeViewProvider;
  private _onDidChangeTreeData: vscode.EventEmitter<DynamicNode | undefined | void> =
    new vscode.EventEmitter<DynamicNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<DynamicNode | undefined | void> =
    this._onDidChangeTreeData.event;

  private needRefresh = true;
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
    return await this.mutex.runExclusive(() => {
      if (!this.needRefresh) {
        this.needRefresh = true;
        this._onDidChangeTreeData.fire();
      }
      return ok(Void);
    });
  }

  public async refreshRemoteEnvWarning() {
    // TODO: remove the dependency of child number.
    // Reload the whole treeview because collapsible state need to be recalculated.
    await this.reloadEnvironments();

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

  public getChildren(element?: DynamicNode): vscode.ProviderResult<DynamicNode[]> {
    if (!element) {
      return this.getEnvironments();
    }
    return element.getChildren();
  }

  private async getEnvironments(): Promise<DynamicNode[] | undefined | null> {
    if (!globalVariables.workspaceUri) {
      return null;
    }
    const workspacePath: string = globalVariables.workspaceUri.fsPath;
    return await this.mutex.runExclusive(async () => {
      if (this.needRefresh) {
        const envNamesResult = await environmentManager.listRemoteEnvConfigs(workspacePath);
        if (envNamesResult.isErr()) {
          this.needRefresh = false;
          return null;
        }

        const envNames = [LocalEnvironmentName].concat(envNamesResult.value);
        this.environments = envNames.map((env) => new EnvironmentNode(env));
        this.needRefresh = false;
      }
      return this.environments;
    });
  }
}

export default EnvironmentTreeViewProvider.getInstance();
