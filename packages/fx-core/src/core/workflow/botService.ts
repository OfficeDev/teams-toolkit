// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, CloudResource, ContextV3, MaybePromise } from "./interface";

@Service("bot-service")
export class BotServiceResource implements CloudResource {
  readonly name = "bot-service";
  provision(
    context: ContextV3,
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: Action = {
      name: "bot-service.provision",
      type: "function",
      plan: (context: ContextV3, inputs: v2.InputsWithProjectPath) => {
        return ok(["create AAD app for bot service (botId, botPassword)"]);
      },
      execute: async (
        context: ContextV3,
        inputs: v2.InputsWithProjectPath
      ): Promise<Result<undefined, FxError>> => {
        inputs["bot-service"] = {
          botAadAppClientId: "MockBotAadAppClientId",
          botId: "MockBotId",
          botPassword: "MockBotPassword",
        };
        return ok(undefined);
      },
    };
    return ok(provision);
  }
}
