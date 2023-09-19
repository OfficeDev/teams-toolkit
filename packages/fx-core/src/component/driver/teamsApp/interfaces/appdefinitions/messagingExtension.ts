// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessagingExtensionCommand } from "./messagingExtensionCommand";
import { MessagingExtensionMessageHandler } from "./messagingExtensionMessageHandler";

export interface MessagingExtension {
  objectId?: string;
  botId?: string;
  messagingExtensionServiceType?: string;
  apiSpecificationFilePath?: string;
  canUpdateConfiguration: boolean;
  commands: MessagingExtensionCommand[];
  messageHandlers: MessagingExtensionMessageHandler[];
}
