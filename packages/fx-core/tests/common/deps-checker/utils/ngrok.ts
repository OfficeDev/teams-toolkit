// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName } from "@microsoft/teamsfx-api";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";

export const ngrokInstallPath = path.join(os.homedir(), `.${ConfigFolderName}`, "bin", "ngrok");
export const ngrokSentinelPath = path.join(os.homedir(), `.${ConfigFolderName}`, "ngrok-sentinel");

export async function cleanup(): Promise<void> {
  await fs.remove(ngrokInstallPath);
  await fs.remove(ngrokSentinelPath);
}
