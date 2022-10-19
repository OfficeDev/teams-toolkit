// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, M365TokenProvider, Result, ok, err, LogProvider } from "@microsoft/teamsfx-api";
import { Messages } from "../messages";
import { BotRegistration, BotAuthType, IBotAadCredentials } from "./botRegistration";

export class RemoteBotRegistration extends BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botConfig?: IBotAadCredentials,
    botAuthType: BotAuthType = BotAuthType.AADApp,
    logProvider?: LogProvider
  ): Promise<Result<IBotAadCredentials, FxError>> {
    const botAadRes = await super.createBotAadApp(m365TokenProvider, aadDisplayName, botConfig);
    if (botAadRes.isErr()) {
      return err(botAadRes.error);
    }
    logProvider?.info(Messages.SuccessfullyCreatedBotAadApp);
    // Didn't provision Azure bot service because it's handled by arm/bicep snippets.
    return ok(botAadRes.value);
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
