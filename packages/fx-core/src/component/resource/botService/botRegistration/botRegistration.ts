// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, Result, ok, M365TokenProvider } from "@microsoft/teamsfx-api";
import { GraphScopes } from "../../../../common/tools";
import { GraphClient } from "./graphClient";

export enum BotAuthType {
  AADApp = "AADApp",
  Identity = "User-Assigned Managed Identity", // TODO: Make room for potential changes in the future.
}

export interface IBotAadCredentials {
  botId: string;
  botPassword: string;
}

export abstract class BotRegistration {
  public async createBotRegistration(
    m365TokenProvider: M365TokenProvider,
    aadDisplayName: string,
    botConfig?: IBotAadCredentials,
    botAuthType: BotAuthType = BotAuthType.AADApp
  ): Promise<Result<IBotAadCredentials, FxError>> {
    if (botAuthType === BotAuthType.AADApp) {
      if (botConfig?.botId && botConfig?.botPassword) {
        // Existing bot aad scenario.
        return ok(botConfig);
      } else {
        // Create a new bot aad app.
        // Prepare graph token.
        const graphTokenRes = await m365TokenProvider.getAccessToken({
          scopes: GraphScopes,
        });

        if (graphTokenRes.isErr()) {
          return err(graphTokenRes.error);
        }
        const graphToken = graphTokenRes.value;

        // Call GraphClient.
        const aadAppCredential = await GraphClient.registerAadApp(graphToken, aadDisplayName);

        return ok({
          botId: aadAppCredential.clientId,
          botPassword: aadAppCredential.clientSecret,
        });
      }
    } else {
      // Suppose === BotAuthType.Identity
      //TODO: Support identity.
      return ok({
        botId: "",
        botPassword: "",
      });
    }
  }

  public abstract updateMessageEndpoint(
    m365TokenProvider: M365TokenProvider,
    botId: string,
    endpoint: string
  ): Promise<Result<undefined, FxError>>;
}
