// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  FxError,
  OptionItem,
  Result,
  SubscriptionInfo,
  SystemError,
  UserError,
  UserInteraction,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "./localizeUtils";

export async function askSubscription(
  azureAccountProvider: AzureAccountProvider,
  ui: UserInteraction,
  activeSubscriptionId?: string
): Promise<Result<SubscriptionInfo, FxError>> {
  const subscriptions: SubscriptionInfo[] = await azureAccountProvider.listSubscriptions();

  if (subscriptions.length === 0) {
    return err(
      new UserError(
        "Core",
        "NoSubscriptionFound",
        getDefaultString("error.NoSubscriptionFound"),
        getLocalizedString("error.NoSubscriptionFound")
      )
    );
  }
  let resultSub = subscriptions.find((sub) => sub.subscriptionId === activeSubscriptionId);
  if (activeSubscriptionId === undefined || resultSub === undefined) {
    let selectedSub: SubscriptionInfo | undefined = undefined;
    if (subscriptions.length === 1) {
      selectedSub = subscriptions[0];
    } else {
      const options: OptionItem[] = subscriptions.map((sub) => {
        return {
          id: sub.subscriptionId,
          label: sub.subscriptionName,
          data: sub.tenantId,
        } as OptionItem;
      });
      const askRes = await ui.selectOption({
        name: "subscription",
        title: "Select a subscription",
        options: options,
        returnObject: true,
      });
      if (askRes.isErr()) return err(askRes.error);
      const subItem = askRes.value.result as OptionItem;
      selectedSub = {
        subscriptionId: subItem.id,
        subscriptionName: subItem.label,
        tenantId: subItem.data as string,
      };
    }
    if (selectedSub === undefined) {
      return err(
        new SystemError(
          "Core",
          "NoSubscriptionFound",
          getDefaultString("error.NoSubscriptionFound"),
          getLocalizedString("error.NoSubscriptionFound")
        )
      );
    }
    resultSub = selectedSub;
  }
  return ok(resultSub);
}
