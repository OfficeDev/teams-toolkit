// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "../appStudio/interfaces/IBotRegistration";
import { err, FxError, ResourceContextV3, Result, v3, ok } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../../constants";
import { AppStudioScopes } from "../../../../common/tools";
import { AppStudioClient } from "../appStudio/appStudioClient";
import { normalizeName } from "../../../utils";
import { PluginLocalDebug, CommonStrings } from "../strings";
import { BotRegistration, BotAuthType, IBotAadCredentials } from "./botRegistration";
import { BotRegistrationNotFoundError } from "../errors";

export class LocalBotRegistration extends BotRegistration {
  // private static instance: LocalBotRegistration;
  // public static getInstance(): LocalBotRegistration {
  //     if (!LocalBotRegistration.instance) {
  //         LocalBotRegistration.instance = new LocalBotRegistration();
  //     }

  //     return LocalBotRegistration.instance;
  // }
  public async createBotRegistration(
    context: ResourceContextV3,
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<undefined, FxError>> {
    const botAadCredential = context.envInfo.state[ComponentNames.TeamsBot] as IBotAadCredentials;
    const appStudioTokenRes = await context.tokenProvider.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    // Check if bot registration exists?
    const botReg = await AppStudioClient.getBotRegistration(botAadCredential.botId, appStudioToken);
    if (botReg) {
      // A bot registration with the specific botId exists, so do nothing.
      return ok(undefined);
    }
    // Register a new bot registration.
    const initialBotReg: IBotRegistration = {
      botId: botAadCredential.botId,
      name: normalizeName(context.projectSetting.appName) + PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
      description: "",
      iconUrl: "",
      messagingEndpoint: "",
      callingEndpoint: "",
    };
    await AppStudioClient.createBotRegistration(initialBotReg, appStudioToken, context);
    return ok(undefined);
  }

  public async updateMessageEndpoint(
    context: ResourceContextV3
  ): Promise<Result<undefined, FxError>> {
    const teamsBotState = context.envInfo.state[ComponentNames.TeamsBot];
    const appStudioTokenRes = await context.tokenProvider.m365TokenProvider.getAccessToken({
      scopes: AppStudioScopes,
    });
    if (appStudioTokenRes.isErr()) {
      return err(appStudioTokenRes.error);
    }
    const appStudioToken = appStudioTokenRes.value;
    await AppStudioClient.updateMessageEndpoint(
      appStudioToken,
      teamsBotState.botId,
      `${teamsBotState.siteEndpoint}${CommonStrings.MESSAGE_ENDPOINT_SUFFIX}`
    );
    return ok(undefined);
  }
}
