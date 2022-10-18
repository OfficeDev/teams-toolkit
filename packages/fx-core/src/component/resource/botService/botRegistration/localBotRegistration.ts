// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import {
  err,
  FxError,
  ResourceContextV3,
  Result,
  ok,
  M365TokenProvider,
} from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../../constants";
import { AppStudioScopes } from "../../../../common/tools";
import { AppStudioClient } from "../appStudio/appStudioClient";
import { CommonStrings } from "../strings";
import { BotRegistration, BotAuthType, IBotAadCredentials } from "./botRegistration";

export class LocalBotRegistration extends BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botConfig?: IBotAadCredentials,
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<IBotAadCredentials, FxError>> {
    const superRes = await super.createBotRegistration(
      m365TokenProvider,
      aadDisplayName,
      botConfig
    );
    if (superRes.isErr()) {
      return err(superRes.error);
    }
    const botAadCredentials: IBotAadCredentials = superRes.value;

    const appStudioTokenRes = await m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }

    const appStudioToken = appStudioTokenRes.value;
    // Check if bot registration exists?
    const botReg = await AppStudioClient.getBotRegistration(
      botAadCredentials.botId,
      appStudioToken
    );
    if (botReg) {
      // A bot registration with the specific botId exists, so do nothing.
      return ok(botAadCredentials);
    }
    // Register a new bot registration.
    const initialBotReg: IBotRegistration = {
      botId: botAadCredentials.botId,
      name: aadDisplayName,
      description: "",
      iconUrl: "",
      messagingEndpoint: "",
      callingEndpoint: "",
    };
    await AppStudioClient.createBotRegistration(initialBotReg, appStudioToken);
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
