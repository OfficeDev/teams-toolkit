import { MessagingExtensionMessageHandlerLink } from "./messagingExtensionMessageHandlerLink";

export interface MessagingExtensionMessageHandler {
  type: string;
  value: MessagingExtensionMessageHandlerLink;
}
