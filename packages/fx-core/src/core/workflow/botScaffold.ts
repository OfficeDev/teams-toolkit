// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, AddInstanceAction, MaybePromise, ResourcePlugin } from "./interface";
import { TeamsBotInputs } from "./teamsBot";

/**
 * bot scaffold plugin
 */
@Service("bot-scaffold")
export class BotScaffoldResource implements ResourcePlugin {
  name = "bot-scaffold";
  generateCode(
    context: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const botInputs = inputs as TeamsBotInputs;
    const action: AddInstanceAction = {
      name: "bot-scaffold.generateCode",
      type: "function",
      plan: (context: v2.Context, inputs: v2.InputsWithProjectPath) => {
        return ok(
          `scaffold bot source code for language: ${botInputs.language}, scenario: ${botInputs.scenario}, hostingResource: ${botInputs.hostingResource}`
        );
      },
      execute: async (
        context: v2.Context,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        console.log(
          `scaffold bot source code for language: ${botInputs.language}, scenario: ${botInputs.scenario}, hostingResource: ${botInputs.hostingResource}`
        );
        return ok(undefined);
      },
    };
    return ok(action);
  }
}
