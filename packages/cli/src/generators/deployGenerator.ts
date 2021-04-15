// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { err, FxError, ok, QTreeNode, Result, Stage } from "fx-api";

import * as constants from "../constants";
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
    const allNodes = result.value as QTreeNode[];
    return ok([constants.RootFolderNode, ...allNodes]);
  }
}
