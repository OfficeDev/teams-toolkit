// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, ok, Result, TokenProvider, v2, v3 } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { Action, MaybePromise, ProvisionAction, AzureResource } from "./interface";

@Service("azure-bot")
export class AzureBotResource implements AzureResource {
  readonly type = "azure";
  readonly name = "azure-bot";
  provision(
    context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
    inputs: v2.InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    const provision: ProvisionAction = {
      name: "azure-bot.provision",
      type: "function",
      plan: (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: v2.InputsWithProjectPath
      ) => {
        return ok([
          "provision azure-bot step 1.create AAD app for bot service",
          "provision azure-bot step 2.create azure bot service",
        ]);
      },
      execute: async (
        context: { ctx: v2.Context; envInfo: v3.EnvInfoV3; tokenProvider: TokenProvider },
        inputs: Inputs
      ): Promise<Result<undefined, FxError>> => {
        console.log("provision azure-bot step 1.create AAD app for bot service");
        console.log("provision azure-bot step 2.create azure bot service");
        inputs["azure-bot"] = {
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
