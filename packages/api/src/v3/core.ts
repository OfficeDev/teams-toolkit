// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Core } from "../core";
import { FxError } from "../error";
import { Void } from "../types";
import { InputsWithProjectPath } from "../v2/types";

export interface ICore extends Core {
  /**
   * add feature means add/modify files in local workspace folder:
   * 1. scaffold/update source code
   * 2. generate/update arm templates
   * 3. update teams app manifest file
   */
  addFeature: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
}
