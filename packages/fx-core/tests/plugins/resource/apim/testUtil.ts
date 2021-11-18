// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { GraphTokenProvider } from "@microsoft/teamsfx-api";
import { BuildError, NotImplemented } from "../../../../src/plugins/resource/apim/error";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { AssertNotEmpty } from "../../../../src/plugins/resource/apim/error";
import dotenv from "dotenv";

dotenv.config();

export class MockGraphTokenProvider implements GraphTokenProvider {
  private readonly clientId: string;
  private readonly tenantId: string;
  private readonly clientSecret: string;

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getAccessToken(): Promise<string> {
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
    return AssertNotEmpty("accessToken", credential?.accessToken);
  }

  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw BuildError(NotImplemented);
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw BuildError(NotImplemented);
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
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
