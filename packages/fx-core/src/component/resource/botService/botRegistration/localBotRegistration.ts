// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan He <ruhe@microsoft.com>
 */
import { BotChannelType, IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { err, FxError, Result, ok, M365TokenProvider, LogProvider } from "@microsoft/teamsfx-api";
import { AppStudioScopes } from "../../../../common/tools";
import { AppStudioClient } from "../appStudio/appStudioClient";
import { BotRegistration, BotAuthType, BotAadCredentials } from "./botRegistration";
import { Messages } from "../messages";
import { Utils } from "./utils";

export class LocalBotRegistration extends BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botName: string,
    botConfig?: BotAadCredentials,
    logProvider?: LogProvider,
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<BotAadCredentials, FxError>> {
    const botAadRes = await super.createBotAadApp(
      m365TokenProvider,
      aadDisplayName,
      botConfig,
      logProvider,
      botAuthType
    );
    if (botAadRes.isErr()) {
      return err(botAadRes.error);
    }

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
      configuredChannels: [BotChannelType.MicrosoftTeams],
    };
    await AppStudioClient.createBotRegistration(appStudioToken, initialBotReg);
    logProvider?.info(Messages.SuccessfullyProvisionedBotRegistration);
    return ok(botAadCredentials);
  }

  public async createOrUpdateBotRegistration(
    m365TokenProvider: M365TokenProvider,
    botRegistration: IBotRegistration
  ): Promise<Result<boolean, FxError>> {
    // 1. Get bot registration from remote.
    // 2. If Not Found, Then create a new bot registration.
    // 3. Else:
    //      3.1 Merge bot registration (remote + passed-in, respect passed-in).
    //      3.2 Update bot registration.
    const appStudioTokenRes = await m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    const remoteBotRegistration = await AppStudioClient.getBotRegistration(
      appStudioToken,
      botRegistration.botId!
    );
    if (!remoteBotRegistration) {
      // Not Found case.
      await AppStudioClient.createBotRegistration(appStudioToken, botRegistration, false);
    } else {
      // Update bot registration.
      const mergedBotRegistration = Utils.mergeIBotRegistration(
        botRegistration,
        remoteBotRegistration
      );
      await AppStudioClient.updateBotRegistration(appStudioToken, mergedBotRegistration);
    }
    return ok(remoteBotRegistration !== undefined);
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
