// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateOrUpdateM365BotArgs {
  botId: string;
  name: string;
  messagingEndpoint: string;
  description?: string;
  iconUrl?: string;
}
