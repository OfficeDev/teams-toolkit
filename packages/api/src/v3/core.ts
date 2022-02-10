// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Core } from "../core";
import { FxError } from "../error";
import { Void } from "../types";
import { InputsWithProjectPath } from "../v2/types";

export interface ICore extends Core {
  /**
   * init means enable TeamsFx feature for current project folder.
   * init command is called to create a minimized teamsfx project
   */
  init: (inputs: InputsWithProjectPath & { solution?: string }) => Promise<Result<Void, FxError>>;
  /**
   * add feature means add/modify files in local workspace folder:
   * 1. scaffold/update source code
   * 2. generate/update arm templates
   * 3. update teams app manifest file
   */
  addFeature: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
}
