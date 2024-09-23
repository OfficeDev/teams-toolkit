// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DeclarativeAgentBotDefinition {
  GptDefinition: DeclarativeAgentDefinition;
  PersistentModel: number;
  EnableChannels: string[];
}

export interface DeclarativeAgentDefinition {
  id?: string;
  name: string;
  description: string;
  instructions?: string;
}
