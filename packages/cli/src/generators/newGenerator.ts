// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  Stage,
  QTreeNode,
  FxError,
  ok,
  Result,
  err
} from "fx-api";
import {TeamsCore} from "../../../fx-core/build/core";

import * as constants from "../constants";
import {ContextFactory} from "../context";
import {Generator} from "./generator";

export class NewGenerator extends Generator {
  public readonly commandName = "teamsfx new";

  public readonly outputPath = constants.newParamPath;

  public readonly stage = Stage.create;

  async generate(): Promise<Result<QTreeNode, FxError>> {
    const core = TeamsCore.getInstance();
    {
      const result = await core.getQuestions(ContextFactory.get("./", this.stage));
      if (result.isErr()) {
        return err(result.error);
      }

      const root = result.value!;
      return ok(root);
    }
  }
}
