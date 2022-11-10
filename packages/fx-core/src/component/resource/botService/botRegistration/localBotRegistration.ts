// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { err, FxError, Result, ok, M365TokenProvider, LogProvider } from "@microsoft/teamsfx-api";
import { AppStudioScopes } from "../../../../common/tools";
import { AppStudioClient } from "../appStudio/appStudioClient";
import { BotRegistration, BotAuthType, BotAadCredentials } from "./botRegistration";
import { Messages } from "../messages";

export class LocalBotRegistration extends BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botName: string,
    botConfig?: BotAadCredentials,
    isIdFromState?: boolean,
    botAuthType: BotAuthType = BotAuthType.AADApp,
    logProvider?: LogProvider
  ): Promise<Result<BotAadCredentials, FxError>> {
    const botAadRes = await super.createBotAadApp(
      m365TokenProvider,
      aadDisplayName,
      botConfig,
      botAuthType,
      logProvider
    );
    if (botAadRes.isErr()) {
      return err(botAadRes.error);
    }
    logProvider?.info(Messages.SuccessfullyCreatedBotAadApp);

    const botAadCredentials: BotAadCredentials = botAadRes.value;

    logProvider?.info(Messages.ProvisioningBotRegistration);
    const appStudioTokenRes = await m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }

    const appStudioToken = appStudioTokenRes.value;
    // Register a new bot registration.
    const initialBotReg: IBotRegistration = {
      botId: botAadCredentials.botId,
      name: botName,
      description: "",
      iconUrl: "",
      messagingEndpoint: "",
      callingEndpoint: "",
    };
    await AppStudioClient.createBotRegistration(appStudioToken, initialBotReg, isIdFromState);
    logProvider?.info(Messages.SuccessfullyProvisionedBotRegistration);
    return ok(botAadCredentials);
  }

  public async updateMessageEndpoint(
    m365TokenProvider: M365TokenProvider,
    botId: string,
    endpoint: string
  ): Promise<Result<undefined, FxError>> {
    const appStudioTokenRes = await m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    await AppStudioClient.updateMessageEndpoint(appStudioToken, botId, endpoint);
    return ok(undefined);
  }
}
