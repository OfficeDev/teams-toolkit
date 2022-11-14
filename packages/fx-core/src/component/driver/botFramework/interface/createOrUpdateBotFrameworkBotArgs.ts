// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface CreateOrUpdateBotFrameworkBotArgs {
  botId: string;
  name: string;
  messagingEndpoint: string;
  description?: string;
  iconUrl?: string;
}
