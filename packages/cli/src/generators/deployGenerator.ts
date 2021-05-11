// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { err, FxError, NodeType, ok, QTreeNode, Result, Stage } from "@microsoft/teamsfx-api";

import * as constants from "../constants";
import { flattenNodes } from "../utils";
import { Generator } from "./generator";

export class DeployGenerator extends Generator {
  public readonly commandName = "teamsfx deploy";
  public readonly outputPath = constants.deployParamPath;
  public readonly stage = Stage.deploy;

  async generate(projectPath: string): Promise<Result<QTreeNode[], FxError>> {
    const result = await super.generate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }
    const root = result.value as QTreeNode;
    const allNodes = flattenNodes(root).filter(node => node.data.type !== NodeType.group);
    return ok([constants.RootFolderNode, ...allNodes]);
  }
}
