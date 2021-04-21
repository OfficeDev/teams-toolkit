// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  QTreeNode,
  FxError,
  ok,
  Result,
  err,
  Stage,
  NodeType
} from "fx-api";

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
    const root = (result.value as QTreeNode).children![0];

    const childrenNodes = (root.children || []).concat([]);

    const functionNodes = flattenNodes(childrenNodes.filter(node => (node.condition as any).minItems === 1)[0]);
    const resourcesNode = childrenNodes.filter(node => (node.condition as any).contains === this.resourceName)[0];
    const resourceNodes = resourcesNode ? flattenNodes(resourcesNode) : [];

    (root.data as any).default = [this.resourceName];
    (root.data as any).hide = true;
    root.children = undefined;

    // pick all related questions.
    const allNodes = [root, ...functionNodes, ...resourceNodes].filter(node => node.data.type !== NodeType.group);
    return ok(allNodes);
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
