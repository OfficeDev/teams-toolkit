// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  Platform,
  Stage,
  QTreeNode,
  FxError,
  ok,
  Result,
  err
} from "fx-api";

import activate from "../activate";
import * as constants from "../constants";
import { Generator } from "./generator";

export class NewGenerator extends Generator {
  public readonly commandName = "teamsfx new";

  public readonly outputPath = constants.newParamPath;

  public readonly stage = Stage.create;

  async generate(): Promise<Result<QTreeNode, FxError>> {
    const result = await activate();
    if (result.isErr()) {
      return err(result.error);
    }
    
    const core = result.value;
    {
      const result = await core.getQuestions!(this.stage, Platform.VSCode);
      if (result.isErr()) {
        return err(result.error);
      }
    
      const root = result.value!;
      return ok(root);
    }
  }
}
