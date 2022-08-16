// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RegisterResourceProviderError } from "./errors";
import { Provider, ResourceManagementClient } from "@azure/arm-resources";
import { TokenCredential } from "@azure/core-http";
import { Messages } from "./resources/messages";

import { Providers } from "@azure/arm-resources";
import { Logger } from "./logger";

export function createResourceProviderClient(
  credentials: TokenCredential,
  subscriptionId: string
): Providers {
  const resourceProviderClient = new ResourceManagementClient(credentials, subscriptionId);
  return resourceProviderClient.providers;
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
  try {
    return Promise.all(
      providerNamespaces.map(async (namespace) => {
        const foundRP: Provider | undefined = await findResourceProvider(client, namespace);
        if (!foundRP) {
          return client.register(namespace);
        }
        Logger.info(Messages.ResourceProviderExist(namespace));
        return foundRP;
      })
    );
  } catch (e) {
    throw new RegisterResourceProviderError(e);
  }
}
