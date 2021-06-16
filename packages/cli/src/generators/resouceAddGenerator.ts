// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  QTreeNode,
  FxError,
  ok,
  Result,
  err,
  Stage
} from "@microsoft/teamsfx-api";

import * as constants from "../constants";
import { flattenNodes } from "../utils";
import { Generator } from "./generator";

abstract class ResourceAddGenerator extends Generator {
  abstract readonly resourceName: string;
  
  public readonly stage = Stage.update;

  async generate(projectPath: string): Promise<Result<QTreeNode[], FxError>> {
    const result = await super.generate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }

    /// TODO: This is also a hard code
    const root = result.value as QTreeNode;

    const childrenNodes = (root.children || []).concat([]);

    const functionNodes = flattenNodes(childrenNodes.filter(node => (node.condition as any).minItems === 1)[0]);
    const resourcesNode = childrenNodes.filter(node => (node.condition as any).contains === this.resourceName)[0];
    const resourceNodes = resourcesNode ? flattenNodes(resourcesNode) : [];

    (root.data as any).default = [this.resourceName];
    (root.data as any).hide = true;
    root.children = undefined;

    // pick all related questions.
    const allNodes = [root, ...functionNodes, ...resourceNodes].filter(node => node.data && node.data.type !== "group");
    return ok([constants.RootFolderNode, ...allNodes]);
  }
}

export class ResourceAddFunctionGenerator extends ResourceAddGenerator {
  public readonly commandName = "teamsfx resource add azure-function";
  public readonly resourceName = "function";
  public readonly outputPath = constants.resourceAddFunctionParamPath;
}

export class ResourceAddSqlGenerator extends ResourceAddGenerator {
  public readonly commandName = "teamsfx resource add azure-sql";
  public readonly resourceName = "sql";
  public readonly outputPath = constants.resourceAddSqlParamPath;
}

export class ResourceAddApimGenerator extends ResourceAddGenerator {
  public readonly commandName = "teamsfx resource add apim";
  public readonly resourceName = "apim";
  public readonly outputPath = constants.resourceAddApimParamPath;
}
