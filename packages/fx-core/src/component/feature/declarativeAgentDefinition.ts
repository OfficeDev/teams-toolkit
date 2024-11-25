// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DeclarativeAgentBotDefinition {
  GptDefinition: DeclarativeAgentDefinition;
  PersistentModel: number;
  EnableChannels: string[];
  IsMultiTenant: boolean;
}

export interface DeclarativeAgentDefinition {
  id?: string;
  name: string;
  teams_app_id: string;
}
