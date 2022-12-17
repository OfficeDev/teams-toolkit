// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export enum BotChannelType {
  MicrosoftTeams = "msteams",
  Outlook = "outlook",
}

export interface IBotRegistration {
  botId?: string;
  name: string;
  description: string;
  iconUrl: string;
  messagingEndpoint: string;
  callingEndpoint: string;
  configuredChannels?: BotChannelType[];
}
