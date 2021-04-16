// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  QTreeNode,
  FxError,
  ok,
  Result,
  err,
  MultiSelectQuestion,
  OptionItem,
  Stage
} from "fx-api";

import * as constants from "../constants";
import { Generator } from "./generator";

abstract class ResourceAddGenerator extends Generator {
  abstract readonly resourceName: string;
  
  public readonly stage = Stage.update;

  async generate(projectPath: string): Promise<Result<QTreeNode[], FxError>> {
    const result = await super.generate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }
    const allNodes = result.value as QTreeNode[];

    // get add-azure-resources node
    const resourceParamName = "add-azure-resources";
    const resourceNode = allNodes.filter(node => node.data.name === resourceParamName)[0];
    if (!resourceNode) {
      throw Error(`${resourceParamName} is not found in the update stage's param list.`);
    }
    const option = (resourceNode.data as MultiSelectQuestion).option as OptionItem[];
    const optionIds = option.map((op) => op.id);
    if (!optionIds.includes(this.resourceName)) {
      throw Error(`${optionIds} do not include ${this.resourceName}`);
    }

    // create a new resource node and set default to resource name and hide it
    const newResourceNode = new QTreeNode(Object.assign({}, resourceNode.data));
    (newResourceNode.data as MultiSelectQuestion).default = [this.resourceName];
    (newResourceNode.data as any).hide = true;

    // pick all related questions.
    /// TODO: this may cause problem.
    const resourceRelatedNodes = allNodes.filter(
      node => node.data.name?.includes(this.resourceName) || node.data.description?.includes(this.resourceName)
    );
    return ok([newResourceNode, ...resourceRelatedNodes]);
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
