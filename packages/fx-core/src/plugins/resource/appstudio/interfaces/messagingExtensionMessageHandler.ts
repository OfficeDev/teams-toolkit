// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessagingExtensionMessageHandlerLink } from "./messagingExtensionMessageHandlerLink";

export interface MessagingExtensionMessageHandler {
  type: string;
  value: MessagingExtensionMessageHandlerLink;
}
