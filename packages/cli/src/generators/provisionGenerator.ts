// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { err, FxError, NodeType, ok, QTreeNode, Result, Stage } from "@microsoft/teamsfx-api";

import * as constants from "../constants";
import { flattenNodes } from "../utils";
import { Generator } from "./generator";

export class ProvisionGenerator extends Generator {
  public readonly commandName = "teamsfx provision";
  public readonly outputPath = constants.provisionParamPath;
  public readonly stage = Stage.provision;

  async generate(projectPath: string): Promise<Result<QTreeNode[], FxError>> {
    const result = await super.generate(projectPath);
    if (result.isErr()) {
      return err(result.error);
    }
    const root = result.value as QTreeNode;
    const allNodes = flattenNodes(root).filter((node) => node.data.type !== NodeType.group);
    return ok([constants.RootFolderNode, constants.SubscriptionNode, ...allNodes]);
  }
}
