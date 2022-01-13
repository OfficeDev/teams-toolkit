// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { LogProvider, Tools } from "@microsoft/teamsfx-api";

export let Logger: LogProvider;
export let TOOLS: Tools;
export function setTools(tools: Tools): void {
  TOOLS = tools;
}
