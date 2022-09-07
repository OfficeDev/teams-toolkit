// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AccessToken } from "@azure/identity";
import { TurnContext, MessagingExtensionResponse, ActivityTypes } from "botbuilder";
import { parseJwt, getScopesArray, formatString } from "../util/utils";
import { TeamsMsgExtTokenResponse } from "./teamsMsgExtTokenResponse";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { AuthenticationConfiguration } from "../models/configuration";
import { internalLogger } from "../util/logger";
import { TeamsFx } from "../core/teamsfx";
/**
 * Retrieve the OAuth Sign in Link to use in the MessagingExtensionResult Suggested Actions.
 * This method only work on MessageExtension with Query now.
 *
 * @param {TeamsFx} teamsfx - Used to provide configuration and auth.
 * @param {string | string[]} scopes - The list of scopes for which the token will have access.
 *
 * @returns SignIn link CardAction with 200 status code.
 */
function getSignInResponseForMessageExtension(teamsfx: TeamsFx, scopes: string | string[]): any {
  const scopesArray = getScopesArray(scopes);
  const signInLink = `${teamsfx.getConfig("initiateLoginEndpoint")}?scope=${encodeURI(
    scopesArray.join(" ")
  )}&clientId=${teamsfx.getConfig("clientId")}&tenantId=${teamsfx.getConfig("tenantId")}`;
  return {
    composeExtension: {
      type: "silentAuth",
      suggestedActions: {
        actions: [
          {
            type: "openUrl",
            value: signInLink,
            title: "Message Extension OAuth",
          },
        ],
      },
    },
  };
}

/**
 * execution in message extension with SSO token.
 *
 * @param {TurnContext} context - The context object for the current turn.
 * @param {AuthenticationConfiguration} config - User custom the message extension authentication configuration.
 * @param {string[]} scopes - The list of scopes for which the token will have access.
 * @param {function} logic - The user execution code with SSO token.
 *
 * @throws {@link ErrorCode|InternalError} when failed to get access token with unknown error.
 * @throws {@link ErrorCode|TokenExpiredError} when SSO token has already expired.
 * @throws {@link ErrorCode|ServiceError} when failed to get access token from simple auth server.
 * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
 * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
 *
 * @returns An Invoke Response for the activity. If the logic not return any, return void instead.
 */
export async function executionWithToken(
  context: TurnContext,
  config: AuthenticationConfiguration,
  scopes: string | string[],
  logic?: (token: TeamsMsgExtTokenResponse) => Promise<any>
): Promise<MessagingExtensionResponse | void> {
  const valueObj = context.activity.value;
  if (!valueObj.authentication || !valueObj.authentication.token) {
    internalLogger.verbose("No AccessToken in request, return silentAuth for AccessToken");
    return getSignInResponseForMessageExtension(new TeamsFx(undefined, config), scopes);
  }
  try {
    const teamsfx = new TeamsFx(undefined, config).setSsoToken(valueObj.authentication.token);
    const token: AccessToken | null = await teamsfx.getCredential().getToken(scopes);
    const ssoTokenExpiration: number = parseJwt(valueObj.authentication.token).exp;
    const tokenRes: TeamsMsgExtTokenResponse = {
      ssoToken: valueObj.authentication.token,
      ssoTokenExpiration: new Date(ssoTokenExpiration * 1000).toISOString(),
      token: token!.token,
      expiration: token!.expiresOnTimestamp.toString(),
      connectionName: "",
    };
    if (logic) {
      return await logic(tokenRes);
    }
  } catch (err) {
    if (err instanceof ErrorWithCode && err.code === ErrorCode.UiRequiredError) {
      internalLogger.verbose("User not consent yet, return 412 to user consent first.");
      const response = { status: 412 };
      await context.sendActivity({ value: response, type: ActivityTypes.InvokeResponse });
      return;
    }
    throw err;
  }
}

/**
 * Users execute query with SSO or Access Token.
 *
 * @param {TurnContext} context - The context object for the current turn.
 * @param {AuthenticationConfiguration} config - User custom the message extension authentication configuration.
 * @param {string| string[]} scopes - The list of scopes for which the token will have access.
 * @param {function} logic - The user execution code with SSO or Access token.
 *
 * @throws {@link ErrorCode|InternalError} when User invoke not response to message extension query.
 * @throws {@link ErrorCode|InternalError} when failed to get access token with unknown error.
 * @throws {@link ErrorCode|TokenExpiredError} when SSO token has already expired.
 * @throws {@link ErrorCode|ServiceError} when failed to get access token from simple auth server.
 * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
 * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is nodeJS.
 *
 * @returns An Invoke Response for the activity. If the logic not return any, return void instead.
 */
export async function queryWithToken(
  context: TurnContext,
  config: AuthenticationConfiguration | null,
  scopes: string | string[],
  logic: (token: TeamsMsgExtTokenResponse) => Promise<any>
): Promise<MessagingExtensionResponse | void> {
  if (context.activity.name != "composeExtension/query") {
    internalLogger.error(ErrorMessage.OnlySupportInQueryActivity);
    throw new ErrorWithCode(
      formatString(ErrorMessage.OnlySupportInQueryActivity),
      ErrorCode.FailedOperation
    );
  }
  return await executionWithToken(context, config ?? {}, scopes, logic);
}
