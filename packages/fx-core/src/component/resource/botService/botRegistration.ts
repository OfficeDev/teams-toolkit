// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IBotRegistration } from "./appStudio/interfaces/IBotRegistration";
import { err, FxError, ResourceContextV3, Result, v3, ok } from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../constants";
import { GraphScopes } from "../../../common/tools";
import * as uuid from "uuid";
import { ResourceNameFactory } from "./resourceNameFactory";
import { MaxLengths } from "./constants";
import { GraphClient } from "./graphClient";

export enum BotAuthType {
  AADApp = "AADApp",
  Identity = "User-Assigned Managed Identity", // TODO: Make room for potential changes in the future.
}

export class BotRegistration {
  public static async createBotRegistration(
    context: ResourceContextV3, // Require awareness, for example, local vs remote, by context.
    token: string, // Make it general by `token` because the token may comes from M365 or Azure in the future.
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<undefined, FxError>> {
    // Init bot state.
    context.envInfo.state[ComponentNames.TeamsBot] ||= {};

    // Prepare authentication for bot.
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

    // Do bot registration.
    if (context.envInfo.envName === "local") {
    } else {
      // For remote environments.
      // Do nothing since arm/bicep will handle the bot registration.
    }

    // Update states for bot.

    return ok(undefined);
  }

  public static async updateMessageEndpoint(
    botId: string,
    endpoint: string,
    token: string
  ): Promise<void> {}

  public static async updateBotRegistration(
    botRegistration: IBotRegistration,
    token: string
  ): Promise<void> {}
}
