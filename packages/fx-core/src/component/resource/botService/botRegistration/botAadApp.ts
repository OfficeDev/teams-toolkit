// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, Result, ok, M365TokenProvider, LogProvider } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { GraphScopes } from "../../../../common/tools";
import { logMessageKeys } from "./constants";
import { GraphClient } from "./graphClient";
import { NotImplementedError } from "../../../../error/common";

export enum BotAuthType {
  AADApp = "AADApp",
  Identity = "User-Assigned Managed Identity", // TODO: Make room for potential changes in the future.
}

export interface BotAadCredentials {
  botId: string;
  botPassword: string;
}

class Constants {
  public static readonly BOT_REGISTRATION: string = "BotRegistration";
  public static readonly MSI_FOR_BOT: string = "MSI Support for Bot";
}

export async function createBotAadApp(
  m365TokenProvider: M365TokenProvider,
  aadDisplayName: string,
  botConfig?: BotAadCredentials,
  logProvider?: LogProvider,
  botAuthType: BotAuthType = BotAuthType.AADApp
): Promise<Result<BotAadCredentials, FxError>> {
  logProvider?.info(getLocalizedString(logMessageKeys.startCreateBotAadApp));
  if (botAuthType === BotAuthType.AADApp) {
    if (botConfig?.botId && botConfig?.botPassword) {
      // Existing bot aad scenario.
      logProvider?.info(getLocalizedString(logMessageKeys.skipCreateBotAadApp));
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
      try {
        const aadAppCredential = await GraphClient.registerAadApp(graphToken, aadDisplayName);
        logProvider?.info(getLocalizedString(logMessageKeys.successCreateBotAadApp));
        return ok({
          botId: aadAppCredential.clientId,
          botPassword: aadAppCredential.clientSecret,
        });
      } catch (e) {
        logProvider?.info(getLocalizedString(logMessageKeys.failCreateBotAadApp, e.genMessage()));
        return err(e);
      }
    }
  } else {
    // Suppose === BotAuthType.Identity
    //TODO: Support identity.
    return err(new NotImplementedError(Constants.BOT_REGISTRATION, Constants.MSI_FOR_BOT));
  }
}
