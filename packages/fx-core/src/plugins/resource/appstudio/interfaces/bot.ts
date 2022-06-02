import { BotCommand } from "./botCommand";

export interface Bot {
  objectId: string | null;
  botId: string | null;
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
