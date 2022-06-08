// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { BotCommand } from "./botCommand";

export interface Bot {
  objectId?: string;
  botId?: string;
  needsChannelSelector: boolean;
  isNotificationOnly: boolean;
  supportsFiles: boolean;
  supportsCalling: boolean;
  supportsVideo: boolean;
  scopes: string[];
  teamCommands: BotCommand[];
  personalCommands: BotCommand[];
  groupChatCommands: BotCommand[];
}
