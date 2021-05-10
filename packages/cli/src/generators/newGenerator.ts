// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { Stage } from "@microsoft/teamsfx-api";

import * as constants from "../constants";
import { Generator } from "./generator";

export class NewGenerator extends Generator {
  public readonly commandName = "teamsfx new";
  public readonly outputPath = constants.newParamPath;
  public readonly stage = Stage.create;
}
