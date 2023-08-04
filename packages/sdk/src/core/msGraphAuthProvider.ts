// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { ErrorWithCode, ErrorCode } from "./errors";
import { TeamsFxConfiguration } from "../models/teamsfxConfiguration";
import { internalLogger } from "../util/logger";
import { validateScopesType } from "../util/utils";
import { AccessToken, TokenCredential } from "@azure/identity";

const defaultScope = "https://graph.microsoft.com/.default";

// eslint-disable-next-line no-secrets/no-secrets
/**
 * Microsoft Graph auth provider for Teams Framework
 * @deprecated Use `TokenCredentialAuthenticationProvider` from `@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials` instead.
 */
export class MsGraphAuthProvider implements AuthenticationProvider {
  private credentialOrTeamsFx: TokenCredential | TeamsFxConfiguration;
  private scopes: string | string[];

  /**
   * Constructor of MsGraphAuthProvider.
   *
   * @param {TeamsFxConfiguration} teamsfx - Used to provide configuration and auth.
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   *
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   *
   * @returns An instance of MsGraphAuthProvider.
   */
  constructor(teamsfx: TeamsFxConfiguration, scopes?: string | string[]);
  /**
   * Constructor of MsGraphAuthProvider.
   *
   * @param {TokenCredential} credential - credential used to provide configuration and auth.
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   *
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   *
   * @returns An instance of MsGraphAuthProvider.
   */
  constructor(credential: TokenCredential, scopes?: string | string[]);
  constructor(
    credentialOrTeamsFx: TeamsFxConfiguration | TokenCredential,
    scopes?: string | string[]
  ) {
    this.credentialOrTeamsFx = credentialOrTeamsFx;

    let scopesStr = defaultScope;
    if (scopes) {
      validateScopesType(scopes);
      scopesStr = typeof scopes === "string" ? scopes : scopes.join(" ");
      if (scopesStr === "") {
        scopesStr = defaultScope;
      }
    }

    internalLogger.info(
      `Create Microsoft Graph Authentication Provider with scopes: '${scopesStr}'`
    );

    this.scopes = scopesStr;
  }

  /**
   * Get access token for Microsoft Graph API requests.
   *
   * @throws {@link ErrorCode|InternalError} when get access token failed due to empty token or unknown other problems.
   * @throws {@link ErrorCode|TokenExpiredError} when SSO token has already expired.
   * @throws {@link ErrorCode|UiRequiredError} when need user consent to get access token.
   * @throws {@link ErrorCode|ServiceError} when failed to get access token from simple auth or AAD server.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   *
   * @returns Access token from the credential.
   *
   */
  public async getAccessToken(): Promise<string> {
    internalLogger.info(`Get Graph Access token with scopes: '${this.scopes.toString()}'`);

    let accessToken: AccessToken | null;
    if ((this.credentialOrTeamsFx as TeamsFxConfiguration).getCredential) {
      accessToken = await (this.credentialOrTeamsFx as TeamsFxConfiguration)
        .getCredential()
        .getToken(this.scopes);
    } else {
      accessToken = await (this.credentialOrTeamsFx as TokenCredential).getToken(this.scopes);
    }

    return new Promise<string>((resolve, reject) => {
      if (accessToken) {
        resolve(accessToken.token);
      } else {
        const errorMsg = "Graph access token is undefined or empty";
        internalLogger.error(errorMsg);
        reject(new ErrorWithCode(errorMsg, ErrorCode.InternalError));
      }
    });
  }
}
