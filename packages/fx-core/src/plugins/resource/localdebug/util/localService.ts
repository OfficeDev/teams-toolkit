// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import * as os from "os";
import { ProductName } from "teamsfx-api";

export async function prepareLocalAuthService(zipPath: string): Promise<string> {
    const toolkitHome = `${os.homedir()}/.${ProductName}`;
    const authServiceFolder = `${toolkitHome}/localauth`;
    const authServiceDll = `${authServiceFolder}/Microsoft.TeamsRuntimeConnector.dll`;
    if (!await fs.pathExists(authServiceDll))
    {
        const zip = new AdmZip(zipPath);
        await fs.ensureDir(authServiceFolder);
        zip.extractAllTo(authServiceFolder, true);
    }

    return authServiceFolder;
}