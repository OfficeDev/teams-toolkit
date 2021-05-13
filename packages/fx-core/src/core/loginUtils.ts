// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

export type AzureSubscription = {
  displayName: string;
  subscriptionId: string;
};

interface PartialList<T> extends Array<T> {
  nextLink?: string;
}

// Copied from https://github.com/microsoft/vscode-azure-account/blob/2b3c1a8e81e237580465cc9a1f4da5caa34644a6/sample/src/extension.ts
// to list all subscriptions
async function listAll<T>(
  client: { listNext(nextPageLink: string): Promise<PartialList<T>> },
  first: Promise<PartialList<T>>
): Promise<T[]> {
  const all: T[] = [];
  for (
    let list = await first;
    list.length || list.nextLink;
    list = list.nextLink ? await client.listNext(list.nextLink) : []
  ) {
    all.push(...list);
  }
  return all;
}

export async function getSubscriptionList(
  azureToken: TokenCredentialsBase
): Promise<AzureSubscription[]> {
  const client = new SubscriptionClient(azureToken);
  const subscriptions = await listAll(client.subscriptions, client.subscriptions.list());
  const subs: Partial<AzureSubscription>[] = subscriptions.map((sub) => {
    return { displayName: sub.displayName, subscriptionId: sub.subscriptionId };
  });
  const filteredSubs = subs.filter(
    (sub) => sub.displayName !== undefined && sub.subscriptionId !== undefined
  );
  return filteredSubs.map((sub) => {
    return { displayName: sub.displayName!, subscriptionId: sub.subscriptionId! };
  });
}
