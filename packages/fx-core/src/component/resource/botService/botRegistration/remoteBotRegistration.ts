// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, M365TokenProvider, Result, ok, err, LogProvider } from "@microsoft/teamsfx-api";
import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { Messages } from "../messages";
import { BotRegistration, BotAuthType, BotAadCredentials } from "./botRegistration";

export class RemoteBotRegistration extends BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botName: string,
    botConfig?: BotAadCredentials,
    botAuthType: BotAuthType = BotAuthType.AADApp,
    logProvider?: LogProvider
  ): Promise<Result<BotAadCredentials, FxError>> {
    const botAadRes = await super.createBotAadApp(m365TokenProvider, aadDisplayName, botConfig);
    if (botAadRes.isErr()) {
      return err(botAadRes.error);
    }
    // logProvider?.info(Messages.SuccessfullyCreatedBotAadApp);
    // Didn't provision Azure bot service because it's handled by arm/bicep snippets.
    return ok(botAadRes.value);
  }

  public async createOrUpdateBotRegistration(
    m365TokenProvider: M365TokenProvider,
    botRegistration: IBotRegistration
  ): Promise<Result<boolean, FxError>> {
    // Do nothing because it's handled by arm/bicep snippets.
    return ok(false);
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
