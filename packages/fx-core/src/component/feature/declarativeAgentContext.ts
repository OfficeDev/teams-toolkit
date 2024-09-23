// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";

export interface DeclarativeAgentContext {
  backupPath: string;
  projectPath: string;
  declarativeAgentManifestPath: string;
  tokenProvider: M365TokenProvider;
}
