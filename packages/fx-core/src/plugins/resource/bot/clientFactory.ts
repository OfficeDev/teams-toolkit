// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { RegisterResourceProviderError } from "./errors";
import { Provider } from "@azure/arm-resources/esm/models";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { Messages } from "./resources/messages";

import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { Logger } from "./logger";

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
