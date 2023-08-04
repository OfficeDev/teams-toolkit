// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TurnContext, MessagingExtensionResponse } from "botbuilder";
import {
  AuthenticationConfiguration,
  OnBehalfOfCredentialAuthConfig,
} from "../models/configuration";
import { MessageExtensionTokenResponse } from "./teamsMsgExtTokenResponse";
import { ErrorWithCode, ErrorMessage, ErrorCode } from "../core/errors";
import { formatString } from "../util/utils";

// eslint-disable-next-line no-secrets/no-secrets
/**
 * Users execute query with SSO or Access Token.
 * @deprecated
 * @remarks
 * Only works in in server side.
 */
export function handleMessageExtensionQueryWithToken(
  context: TurnContext,
  config: AuthenticationConfiguration,
  scopes: string | string[],
  logic: (token: MessageExtensionTokenResponse) => Promise<any>
): Promise<MessagingExtensionResponse | void> {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "queryWithToken in message extension"),
    ErrorCode.RuntimeNotSupported
  );
}

/**
 * Users execute query with SSO or Access Token.
 * @remarks
 * Only works in in server side.
 */
export function handleMessageExtensionQueryWithSSO(
  context: TurnContext,
  config: OnBehalfOfCredentialAuthConfig,
  initiateLoginEndpoint: string,
  scopes: string | string[],
  logic: (token: MessageExtensionTokenResponse) => Promise<any>
) {
  throw new ErrorWithCode(
    formatString(ErrorMessage.BrowserRuntimeNotSupported, "queryWithToken in message extension"),
    ErrorCode.RuntimeNotSupported
  );
}
