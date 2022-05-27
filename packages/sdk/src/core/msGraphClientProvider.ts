// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Client } from "@microsoft/microsoft-graph-client";
import { MsGraphAuthProvider } from "./msGraphAuthProvider";
import { TeamsFxConfiguration } from "../models/teamsfxConfiguration";
import { internalLogger } from "../util/logger";

/**
 * Get Microsoft graph client.
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
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth.
 * @param scopes - The array of Microsoft Token scope of access. Default value is `[.default]`.
 *
 * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
 *
 * @returns Graph client with specified scopes.
 */
export function createMicrosoftGraphClient(
  teamsfx: TeamsFxConfiguration,
  scopes?: string | string[]
): Client {
  internalLogger.info("Create Microsoft Graph Client");
  const authProvider = new MsGraphAuthProvider(teamsfx, scopes);
  const graphClient = Client.initWithMiddleware({
    authProvider,
  });

  return graphClient;
}
