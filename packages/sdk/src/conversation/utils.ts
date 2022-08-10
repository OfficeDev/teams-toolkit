// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConversationReference, TurnContext } from "botbuilder";
import { NotificationTargetType } from "./interface";

/**
 * @internal
 */
export function cloneConversation(
  conversation: Partial<ConversationReference>
): ConversationReference {
  return JSON.parse(JSON.stringify(conversation));
}

/**
 * @internal
 */
export function getTargetType(
  conversationReference: Partial<ConversationReference>
): NotificationTargetType | undefined {
  const conversationType = conversationReference.conversation?.conversationType;
  if (conversationType === "personal") {
    return NotificationTargetType.Person;
  } else if (conversationType === "groupChat") {
    return NotificationTargetType.Group;
  } else if (conversationType === "channel") {
    return NotificationTargetType.Channel;
  } else {
    return undefined;
  }
}

/**
 * @internal
 */
export function getTeamsBotInstallationId(context: TurnContext): string | undefined {
  return context.activity?.channelData?.team?.id ?? context.activity.conversation.id;
}
