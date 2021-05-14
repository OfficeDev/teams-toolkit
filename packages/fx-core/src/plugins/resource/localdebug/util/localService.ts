// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import AdmZip from "adm-zip";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

export async function prepareLocalAuthService(zipPath: string): Promise<string> {
  const toolkitHome = `${os.homedir()}/.${ConfigFolderName}`;
  const zipFolder = path.dirname(zipPath);
  const versionPath = `${zipFolder}/version.txt`;
  const authServiceFolder = `${toolkitHome}/localauth`;
  const authServiceDll = `${authServiceFolder}/Microsoft.TeamsFx.SimpleAuth.dll`;
  const authServiceVersion = `${toolkitHome}/localauth-version.txt`;

  const expectedVersion = await tryGetVersion(versionPath);
  const actualVersion = await tryGetVersion(authServiceVersion);
  if (
    !expectedVersion ||
    !actualVersion ||
    expectedVersion !== actualVersion ||
    !(await fs.pathExists(authServiceDll))
  ) {
    const zip = new AdmZip(zipPath);
    await fs.ensureDir(authServiceFolder);
    zip.extractAllTo(authServiceFolder, true);

    if (expectedVersion) {
      await fs.writeFile(authServiceVersion, expectedVersion, "utf8");
    }
  }

  return authServiceFolder;
}

async function tryGetVersion(versionFile: string): Promise<string | undefined> {
  try {
    if (await fs.pathExists(versionFile)) {
      const version = (await fs.readFile(versionFile, "utf8")).trim();
      return version.length > 0 ? version : undefined;
    }

    return undefined;
  } catch {
    // ignore error and return undefine
    return undefined;
  }
}
