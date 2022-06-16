// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MessagingExtensionParameterChoice } from "./messagingExtensionParameterChoice";

export interface MessagingExtensionCommandParameter {
  name: string;
  title: string;
  description: string;
  inputType: string;
  choices: MessagingExtensionParameterChoice[];
}
