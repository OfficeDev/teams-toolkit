// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Client } from "@microsoft/microsoft-graph-client";
import { MsGraphAuthProvider } from "./msGraphAuthProvider";
import { TeamsFxConfiguration } from "../models/teamsfxConfiguration";
import { internalLogger } from "../util/logger";
import { TokenCredential } from "@azure/identity";

/**
 * Get Microsoft graph client.
 * @deprecated Use `TokenCredentialAuthenticationProvider` and `Client.initWithMiddleware` instead.
 * ```typescript
 * const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: scope });
 * const graph = Client.initWithMiddleware({
 *   authProvider: authProvider,
 * });
 * ```
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
 *    scopes: ["User.Read"],
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

// eslint-disable-next-line no-secrets/no-secrets
/**
 * Get Microsoft graph client.
 * @deprecated Use `TokenCredentialAuthenticationProvider` and `Client.initWithMiddleware` instead.
 * ```typescript
 * const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: scope });
 * const graph = Client.initWithMiddleware({
 *   authProvider: authProvider,
 * });
 * ```
 * 
 * @example
 * Get Microsoft graph client by TokenCredential
 * ```typescript
 * // In browser: TeamsUserCredential
 * const authConfig: TeamsUserCredentialAuthConfig = {
 *   clientId: "xxx",
    initiateLoginEndpoint: "https://xxx/auth-start.html",
 * };

 * const credential = new TeamsUserCredential(authConfig);

 * const scope = "User.Read";
 * await credential.login(scope);

 * const client = createMicrosoftGraphClientWithCredential(credential, scope);

 * // In node: OnBehalfOfUserCredential
 * const oboAuthConfig: OnBehalfOfCredentialAuthConfig = {
 *   authorityHost: "xxx",
 *   clientId: "xxx",
 *   tenantId: "xxx",
 *   clientSecret: "xxx",
 * };

 * const oboCredential = new OnBehalfOfUserCredential(ssoToken, oboAuthConfig);
 * const scope = "User.Read";
 * const client = createMicrosoftGraphClientWithCredential(oboCredential, scope);

 * // In node: AppCredential
 * const appAuthConfig: AppCredentialAuthConfig = {
 *   authorityHost: "xxx",
 *   clientId: "xxx",
 *   tenantId: "xxx",
 *   clientSecret: "xxx",
 * };
 * const appCredential = new AppCredential(appAuthConfig);
 * const scope = "User.Read";
 * const client = createMicrosoftGraphClientWithCredential(appCredential, scope);
 * 
 * const profile = await client.api("/me").get();
 * ```
 *
 * @param {TokenCredential} credential - Used to provide configuration and auth.
 * @param scopes - The array of Microsoft Token scope of access. Default value is `[.default]`.
 *
 * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
 *
 * @returns Graph client with specified scopes.
 */
export function createMicrosoftGraphClientWithCredential(
  credential: TokenCredential,
  scopes?: string | string[]
): Client {
  internalLogger.info("Create Microsoft Graph Client");
  const authProvider = new MsGraphAuthProvider(credential, scopes);
  const graphClient = Client.initWithMiddleware({
    authProvider,
  });
  return graphClient;
}
