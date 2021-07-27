// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Providers } from "@azure/arm-resources";
import { Provider } from "@azure/arm-resources/esm/models";

export class ResourceManagementClient {
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
        ResourceManagementClient.ensureResource(
          () => client.register(namespace),
          () => ResourceManagementClient.findResourceProvider(client, namespace)
        )
      )
    );
  }
}
