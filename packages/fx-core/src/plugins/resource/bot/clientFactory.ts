// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as appService from "@azure/arm-appservice";
import * as msRest from "@azure/ms-rest-js";
import { AzureBotService } from "@azure/arm-botservice";
import { ClientCreationError } from "./errors";
import { ClientNames } from "./resources/strings";
import { Provider } from "@azure/arm-resources/esm/models";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { Messages } from "./resources/messages";

import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { Logger } from "./logger";

export function createAzureBotServiceClient(
  creds: msRest.ServiceClientCredentials,
  subs: string
): AzureBotService {
  if (!subs) {
    throw new ClientCreationError(ClientNames.BOT_SERVICE_CLIENT);
  }

  try {
    return new AzureBotService(creds, subs);
  } catch (e) {
    throw new ClientCreationError(ClientNames.BOT_SERVICE_CLIENT, e);
  }
}

export function createWebSiteMgmtClient(
  creds: msRest.ServiceClientCredentials,
  subs: string
): appService.WebSiteManagementClient {
  if (!subs) {
    throw new ClientCreationError(ClientNames.BOT_SERVICE_CLIENT);
  }

  try {
    return new appService.WebSiteManagementClient(creds, subs);
  } catch (e) {
    throw new ClientCreationError(ClientNames.WEB_SITE_MGMT_CLIENT, e);
  }
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
      const findedRP: Provider | undefined = await findResourceProvider(client, namespace);
      if (!findedRP) {
        return client.register(namespace);
      }
      Logger.info(Messages.ResourceProviderExist(namespace));
      return findedRP;
    })
  );
}
