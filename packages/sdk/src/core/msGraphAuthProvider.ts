// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AuthenticationProvider } from "@microsoft/microsoft-graph-client";
import { TokenCredential } from "@azure/identity";
import { ErrorWithCode, ErrorCode } from "./errors";
import { internalLogger } from "../util/logger";

const defaultScope = "https://graph.microsoft.com/.default";

/**
 * Microsoft Graph auth provider for Teams App Framework
 *
 * @beta
 */
export class MsGraphAuthProvider implements AuthenticationProvider {
  private credential: TokenCredential;
  private scopes: string | string[];

  /**
   * Constructor
   *
   * @param {TokenCredential} credential - Credential used to invoke Microsoft Graph APIs.
   * @param {string | string[]} scopes - Required scope in token when invoking Microsoft Graph APIs.
   *
   * @returns An instance of MsGraphAuthProvider.
   *
   * @beta
   */
  constructor(credential: TokenCredential, scopes?: string | string[]) {
    this.credential = credential;

    let scopesStr = defaultScope;
    if (scopes) {
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
   * Get access token for Microsoft Graph API requests
   *
   * @returns access token from the credential
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
