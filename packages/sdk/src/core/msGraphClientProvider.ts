// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TokenCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { MsGraphAuthProvider } from "./msGraphAuthProvider";
import { internalLogger } from "../util/logger";

/**
 * Get Microsoft graph client, will throw {@link ErrorWithCode} if get GraphClient failed.
 *
 * @example
 * Get Microsoft graph client by TokenCredential
 * ```typescript
 * // Sso token example (Azure Function)
 * const ssoToken = "YOUR_TOKEN_STRING";
 * const options = {"AAD_APP_ID", "AAD_APP_SECRET"};
 * const credential = new OnBehalfOfAADUserCredential(ssoToken, options);
 * const graphClient = await createMicrosoftGraphClient(credential);
 * const profile = await graphClient.api("/me").get();
 *
 * // TeamsBotSsoPrompt example (Bot Application)
 * const requiredScopes = ["User.Read"];
 * const config: Configuration = {
 *    loginUrl: loginUrl,
 *    clientId: clientId,
 *    clientSecret: clientSecret,
 *    tenantId: tenantId
 * };
 * const prompt = new TeamsBotSsoPrompt(dialogId, {
 *    config: config
 *    scopes: '["User.Read"],
 * });
 * this.addDialog(prompt);
 *
 * const oboCredential = new OnBehalfOfAADUserCredential(
 *  getUserId(dialogContext),
 *  {
 *    clientId: "AAD_APP_ID",
 *    clientSecret: "AAD_APP_SECRET"
 *  });
 * try {
 *    const graphClient = await createMicrosoftGraphClient(credential);
 *    const profile = await graphClient.api("/me").get();
 * } catch (e) {
 *    dialogContext.beginDialog(dialogId);
 *    return Dialog.endOfTurn();
 * }
 * ```
 *
 * @param {TokenCredential} credential - token credential instance
 * @param scopes - The array of Microsoft Token scope of access. Default value is `[.default]`.
 *
 * @returns Graph client with specified access.
 *
 * @beta
 */
export function createMicrosoftGraphClient(
  credential: TokenCredential,
  scopes?: string | string[]
): Client {
  internalLogger.info("Create Microsoft Graph Client");
  const authProvider = new MsGraphAuthProvider(credential, scopes);
  const graphClient = Client.initWithMiddleware({
    authProvider
  });

  return graphClient;
}
