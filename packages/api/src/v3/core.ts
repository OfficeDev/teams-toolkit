// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { Core } from "../core";
import { FxError } from "../error";
import { Void } from "../types";
import { InputsWithProjectPath } from "../v2/types";

export interface ICore extends Core {
  /**
   * init means enable TeamsFx feature for current project folder. There are two cases:
   * 1. Init in an empty folder
   * 2.	Init in existing project folder
   * Whether current folder is empty or not, core will create ".fx" folder and "templates" folder with necessary files, similar to what "git init" command do.
   */
  init: (inputs: InputsWithProjectPath & { solution?: string }) => Promise<Result<Void, FxError>>;
  /**
   * A module is a connection between the local code and cloud resource for deployment stage.
   * addModule only update project settings while add capability does more.
   */
  addModule: (
    inputs: InputsWithProjectPath & { capabilities?: string[] }
  ) => Promise<Result<Void, FxError>>;
  /**
   * scaffold will be an independent stage
   */
  scaffold: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
  /**
   * addResource is different from the addResource in userTask
   */
  addResource: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
}
