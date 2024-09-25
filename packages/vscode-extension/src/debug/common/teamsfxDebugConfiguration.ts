// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Hub } from "@microsoft/teamsfx-core";
import * as vscode from "vscode";

export interface TeamsfxDebugConfiguration extends vscode.DebugConfiguration {
  teamsfxIsRemote?: boolean;
  teamsfxEnv?: string;
  teamsfxAppId?: string;
  teamsfxCorrelationId?: string;
  teamsfxHub?: Hub;
}
