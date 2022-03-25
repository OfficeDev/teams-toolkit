// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, AddInstanceAction, MaybePromise, ResourcePlugin } from "./interface";
import { TeamsTabInputs } from "./teamsTab";

/**
 * tab scaffold plugin
 */
@Service("tab-scaffold")
export class TabScaffoldResource implements ResourcePlugin {
  name = "tab-scaffold";
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const action: AddInstanceAction = {
      name: "tab-scaffold.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        const tabInputs = inputs as TeamsTabInputs;
        return ok(
          `scaffold tab source code for language: ${tabInputs.language}, framework: ${tabInputs.framework}, hostingResource: ${tabInputs.hostingResource}`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        const tabInputs = inputs as TeamsTabInputs;
        console.log(
          `scaffold tab source code for language: ${tabInputs.language}, framework: ${tabInputs.framework}, hostingResource: ${tabInputs.hostingResource}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
