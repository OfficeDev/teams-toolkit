// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as os from "os";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

export function getAuthServiceFolder(): string {
  return `${os.homedir()}/.${ConfigFolderName}/localauth`;
}
