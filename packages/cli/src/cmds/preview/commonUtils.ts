// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import * as fs from "fs-extra";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

import * as constants from "./constants";

export async function getActiveResourcePlugins(workspaceFolder: string): Promise<string[]> {
    const settingsPath = path.join(workspaceFolder, `.${ConfigFolderName}`, constants.settingsFileName);
    await fs.writeFile("temp.txt", settingsPath);
    const settings = await fs.readJson(settingsPath);
    return settings.solutionSettings.activeResourcePlugins;
}
