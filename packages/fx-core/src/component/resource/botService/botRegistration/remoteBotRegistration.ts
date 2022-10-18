// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, M365TokenProvider, Result, ok, err } from "@microsoft/teamsfx-api";
import { BotRegistration, BotAuthType, IBotAadCredentials } from "./botRegistration";

export class RemoteBotRegistration extends BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botConfig?: IBotAadCredentials,
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<IBotAadCredentials, FxError>> {
    // Do nothing because it's handled by arm/bicep snippets.
    const superRes = await super.createBotRegistration(
      m365TokenProvider,
      aadDisplayName,
      botConfig
    );
    if (superRes.isErr()) {
      return err(superRes.error);
    }

    return ok({
      botId: "",
      botPassword: "",
    });
  }

  public async updateMessageEndpoint(
    m365TokenProvider: M365TokenProvider,
    botId: string,
    endpoint: string
  ): Promise<Result<undefined, FxError>> {
    // Do nothing because it's handled by arm/bicep snippets.
    return ok(undefined);
  }
}
