// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

interface BotChannelSettings {
  name: string;
}

export interface MicrosoftTeamsChannelSettings extends BotChannelSettings {
  callingWebhook?: string;
}

export interface CreateOrUpdateBotFrameworkBotArgs {
  botId: string;
  name: string;
  messagingEndpoint: string;
  description?: string;
  iconUrl?: string;
  channels?: BotChannelSettings[];
}
