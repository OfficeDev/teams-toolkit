import { MessagingExtensionCommand } from "./messagingExtensionCommand";
import { MessagingExtensionMessageHandler } from "./messagingExtensionMessageHandler";

export interface MessagingExtension {
  objectId: string | null;
  botId: string | null;
  canUpdateConfiguration: boolean;
  commands: MessagingExtensionCommand[];
  messageHandlers: MessagingExtensionMessageHandler[];
}
