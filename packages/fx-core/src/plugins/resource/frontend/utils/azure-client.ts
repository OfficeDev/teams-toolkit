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
  public static async registerResourceProviders(
    client: Providers,
    providerNamespaces: string[]
  ): Promise<Provider[]> {
    return Promise.all(providerNamespaces.map((namespace) => client.register(namespace)));
  }
}
