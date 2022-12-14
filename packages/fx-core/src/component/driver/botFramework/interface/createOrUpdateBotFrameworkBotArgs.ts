// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface BotChannelSettings {
  name: string;
  enable: boolean;
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
