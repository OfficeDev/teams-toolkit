// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "./appStudio/interfaces/IBotRegistration";
import { err, FxError, ResourceContextV3, Result, v3, ok } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../constants";
import { GraphScopes, AppStudioScopes } from "../../../common/tools";
import * as uuid from "uuid";
import { ResourceNameFactory } from "./resourceNameFactory";
import { MaxLengths } from "./constants";
import { GraphClient } from "./graphClient";
import { AppStudioClient } from "./appStudio/appStudioClient";
import { normalizeName } from "../../utils";
import { PluginLocalDebug } from "./strings";

export enum BotAuthType {
  AADApp = "AADApp",
  Identity = "User-Assigned Managed Identity", // TODO: Make room for potential changes in the future.
}

export interface IBotAadCredential {
  botId: string;
  botPassword: string;
}

export class BotRegistration {
  public static async createBotRegistration(
    context: ResourceContextV3,
    token: string, // Make it general by `token` because the token may comes from M365 or Azure in the future.
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<undefined, FxError>> {
    // 1. Init bot state.
    context.envInfo.state[ComponentNames.TeamsBot] ||= {};

    // 2. Prepare authentication for bot.
    if (botAuthType === BotAuthType.AADApp) {
      // Create bot aad app.
      // Respect existing bot aad from config first.
      const botConfig =
        context.envInfo.config.bot?.appId && context.envInfo.config.bot?.appPassword
          ? {
              botId: context.envInfo.config.bot?.appId,
              botPassword: context.envInfo.config.bot?.appPassword,
            }
          : context.envInfo.state[ComponentNames.TeamsBot];

      if (botConfig?.botId && botConfig?.botPassword) {
        // Existing bot aad scenario.
        context.envInfo.state[ComponentNames.TeamsBot] = botConfig;
      } else {
        // Create a new bot aad app.
        // Prepare graph token.
        const graphTokenRes = await context.tokenProvider.m365TokenProvider.getAccessToken({
          scopes: GraphScopes,
        });

        if (graphTokenRes.isErr()) {
          return err(graphTokenRes.error);
        }
        const graphToken = graphTokenRes.value;

        // Prepare aad app name.
        const solutionConfig = context.envInfo.state.solution as v3.AzureSolutionConfig;
        const resourceNameSuffix = solutionConfig.resourceNameSuffix
          ? solutionConfig.resourceNameSuffix
          : uuid.v4();
        const aadDisplayName = ResourceNameFactory.createCommonName(
          resourceNameSuffix,
          context.projectSetting.appName,
          MaxLengths.AAD_DISPLAY_NAME
        );

        // Call GraphClient.
        const aadAppCredential = await GraphClient.registerAadApp(aadDisplayName, graphToken);

        // Save states.
        context.envInfo.state[ComponentNames.TeamsBot] = {
          botId: aadAppCredential.clientId,
          botPassword: aadAppCredential.clientSecret,
        };
      }
    } else {
      // Suppose === BotAuthType.Identity
      //TODO: Support identity.
    }

    // 3. Do bot registration.
    if (context.envInfo.envName === "local") {
      // 3.1 Check if bot registration is existing.
      const botAadCredential = context.envInfo.state[ComponentNames.TeamsBot] as IBotAadCredential;
      const appStudioTokenRes = await context.tokenProvider.m365TokenProvider.getAccessToken({
        scopes: AppStudioScopes,
      });
      if (appStudioTokenRes.isErr()) {
        return err(appStudioTokenRes.error);
      }
      const appStudioToken = appStudioTokenRes.value;
      const botReg = await AppStudioClient.getBotRegistration(
        botAadCredential.botId,
        appStudioToken
      );
      if (botReg) {
        // A bot registration with the specific botId is existing, so do nothing.
        return ok(undefined);
      }
      // 3.2 Register a new bot registration.
      const initialBotReg: IBotRegistration = {
        botId: botAadCredential.botId,
        name: normalizeName(context.projectSetting.appName) + PluginLocalDebug.LOCAL_DEBUG_SUFFIX,
        description: "",
        iconUrl: "",
        messagingEndpoint: "",
        callingEndpoint: "",
      };
      await AppStudioClient.createBotRegistration(initialBotReg, token, context);
    } else {
      // For remote environments.
      // Do nothing since arm/bicep will handle the bot registration.
    }

    return ok(undefined);
  }

  public static async updateMessageEndpoint(
    botId: string,
    endpoint: string,
    token: string
  ): Promise<void> {}
}
