// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FxError,
  LoginStatus,
  M365TokenProvider,
  ok,
  Result,
  TokenRequest,
} from "@microsoft/teamsfx-api";
import { BuildError, NotImplemented } from "../../../../src/component/resource/apim/error";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { AssertNotEmpty } from "../../../../src/component/resource/apim/error";
import dotenv from "dotenv";

dotenv.config();

export class MockM365TokenProvider implements M365TokenProvider {
  private readonly clientId: string;
  private readonly tenantId: string;
  private readonly clientSecret: string;

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }
  getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    throw new Error("Method not implemented.");
  }

  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    const config = {
      auth: {
        clientId: this.clientId,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
        clientSecret: this.clientSecret,
      },
    };

    const clientCredentialRequest = {
      scopes: ["https://graph.microsoft.com/.default"], // replace with your resource
    };

    const cca = new ConfidentialClientApplication(config);
    const credential = await cca.acquireTokenByClientCredential(clientCredentialRequest);
    return ok(AssertNotEmpty("accessToken", credential?.accessToken));
  }

  setStatusChangeMap(
    name: string,
    tokenRequest: TokenRequest,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<Result<boolean, FxError>> {
    throw BuildError(NotImplemented);
  }
  removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    throw BuildError(NotImplemented);
  }
  getJsonObject(tokenRequest: TokenRequest): Promise<Result<Record<string, unknown>, FxError>> {
    throw BuildError(NotImplemented);
  }
  signout(): Promise<boolean> {
    throw BuildError(NotImplemented);
  }
}

export class EnvConfig {
  static servicePrincipalClientId: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_ID ?? "";
  static servicePrincipalClientSecret: string =
    process.env.UT_SERVICE_PRINCIPAL_CLIENT_SECRET ?? "";
}
