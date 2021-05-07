// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { TokenCredential } from "@azure/identity";
import { ErrorWithCode, ErrorCode } from "./errors";
import { internalLogger } from "../util/logger";
import { validateScopesType } from "../util/utils";

const defaultScope = "https://graph.microsoft.com/.default";

/**
 * Microsoft Graph auth provider for Teams Framework
 *
 * @beta
 */
export class MsGraphAuthProvider implements AuthenticationProvider {
  private credential: TokenCredential;
  private scopes: string | string[];

  /**
   * Constructor of MsGraphAuthProvider
   *
   * @param {TokenCredential} credential - Credential used to invoke Microsoft Graph APIs.
   * @param {string | string[]} scopes - The list of scopes for which the token will have access.
   * 
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   *
   * @returns An instance of MsGraphAuthProvider.
   *
   * @beta
   */
  constructor(credential: TokenCredential, scopes?: string | string[]) {
    this.credential = credential;

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
   * @throws {@link ErrorCode|InternalError} when access token is empty or failed to get access token with unknown error.
   * @throws {@link ErrorCode|TokenExpiredError} when SSO token has already expired.
   * @throws {@link ErrorCode|UiRequiredError} when need user consent to get access token.
   * @throws {@link ErrorCode|ServiceError} when failed to get access token from simple auth server.
   * @throws {@link ErrorCode|InvalidParameter} when scopes is not a valid string or string array.
   * 
   * @returns Access token from the credential.
   *
   */
  public async getAccessToken(): Promise<string> {
    internalLogger.info(`Get Graph Access token with scopes: '${this.scopes}'`);
    const accessToken = await this.credential.getToken(this.scopes);

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
