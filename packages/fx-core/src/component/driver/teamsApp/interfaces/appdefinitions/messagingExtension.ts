// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessagingExtensionCommand } from "./messagingExtensionCommand";
import { MessagingExtensionMessageHandler } from "./messagingExtensionMessageHandler";

export interface MessagingExtension {
  objectId?: string;
  botId?: string;
  type?: string;
  apiSpecificationUri?: string;
  canUpdateConfiguration: boolean;
  commands: MessagingExtensionCommand[];
  messageHandlers: MessagingExtensionMessageHandler[];
}
