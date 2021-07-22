// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

import { Provider } from "@azure/arm-resources/esm/models";

export class AzureClientFactory {
  public static getResourceProviderClient(
    credentials: TokenCredentialsBase,
    subscriptionId: string
  ): Providers {
    return new Providers(new ResourceManagementClientContext(credentials, subscriptionId));
  }
}

export class AzureLib {
  public static async ensureResource<T>(
    createFn: () => Promise<T>,
    findFn?: () => Promise<T | undefined>
  ): Promise<T> {
    const _t: T | undefined = await findFn?.();
    return _t ?? createFn();
  }

  public static async findResourceProvider(
    client: Providers,
    namespace: string
  ): Promise<Provider | undefined> {
    const provider = await client.get(namespace);
    if (provider.registrationState === "Registered") {
      return provider;
    }
  }

  public static async ensureResourceProviders(
    client: Providers,
    providerNamespaces: string[]
  ): Promise<Provider[]> {
    return Promise.all(
      providerNamespaces.map((namespace) =>
        AzureLib.ensureResource(
          () => client.register(namespace),
          () => AzureLib.findResourceProvider(client, namespace)
        )
      )
    );
  }
}
