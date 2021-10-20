// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as appService from "@azure/arm-appservice";
import * as msRest from "@azure/ms-rest-js";
import { AzureBotService } from "@azure/arm-botservice";
import { Provider } from "@azure/arm-resources/esm/models";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";

export function createAzureBotServiceClient(
  creds: msRest.ServiceClientCredentials,
  subs: string
): AzureBotService {
  return new AzureBotService(creds, subs);
}

export function createWebSiteMgmtClient(
  creds: msRest.ServiceClientCredentials,
  subs: string
): appService.WebSiteManagementClient {
  return new appService.WebSiteManagementClient(creds, subs);
}

export function createResourceProviderClient(
  credentials: TokenCredentialsBase,
  subscriptionId: string
): Providers {
  return new Providers(new ResourceManagementClientContext(credentials, subscriptionId));
}

export async function findResourceProvider(
  client: Providers,
  namespace: string
): Promise<Provider | undefined> {
  const provider = await client.get(namespace);
  if (provider.registrationState?.trim() === "Registered") {
    return provider;
  }
}

export async function ensureResourceProvider(
  client: Providers,
  providerNamespaces: string[]
): Promise<Provider[]> {
  return Promise.all(
    providerNamespaces.map(async (namespace) => {
      const foundRP: Provider | undefined = await findResourceProvider(client, namespace);
      if (!foundRP) {
        return client.register(namespace);
      }
      return foundRP;
    })
  );
}
