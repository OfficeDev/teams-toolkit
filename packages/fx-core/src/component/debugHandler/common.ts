// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { FxError, Result } from "@microsoft/teamsfx-api";

export interface DebugAction {
  startMessage: string;
  run: () => Promise<Result<string[], FxError>>;
}
