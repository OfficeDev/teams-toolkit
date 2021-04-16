// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { err, FxError, ok, QTreeNode, Result, Stage } from "fx-api";

import * as constants from "../constants";
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
    const allNodes = result.value as QTreeNode[];
    return ok([constants.RootFolderNode, constants.SubscriptionNode, ...allNodes]);
  }
}
