// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ResourceContextV3, Result, ok } from "@microsoft/teamsfx-api";
import { BotRegistration, BotAuthType } from "./botRegistration";

export class RemoteBotRegistration extends BotRegistration {
  // private static instance: RemoteBotRegistration;
  // public static getInstance(): RemoteBotRegistration {
  //     if (!RemoteBotRegistration.instance) {
  //         RemoteBotRegistration.instance = new RemoteBotRegistration();
  //     }
  //     return RemoteBotRegistration.instance;
  // }
  public async createBotRegistration(
    context: ResourceContextV3,
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<undefined, FxError>> {
    // Do nothing because it's handled by arm/bicep snippets.
    return ok(undefined);
  }

  public async updateMessageEndpoint(
    context: ResourceContextV3
  ): Promise<Result<undefined, FxError>> {
    // Do nothing because it's handled by arm/bicep snippets.
    return ok(undefined);
  }
}
