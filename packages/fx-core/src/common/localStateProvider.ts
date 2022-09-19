// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import { CryptoProvider, v3, v2 } from "@microsoft/teamsfx-api";
import { environmentManager } from "../core/environment";

export class LocalStateProvider {
  public readonly projectPath: string;
  constructor(workspaceFolder: string) {
    this.projectPath = `${workspaceFolder}`;
  }

  public async loadV2(
    cryptoProvider?: CryptoProvider,
    includeAAD?: boolean
  ): Promise<v2.EnvInfoV2 | undefined> {
    if (await fs.pathExists(this.projectPath)) {
      const envDataResult = await environmentManager.loadEnvInfo(
        this.projectPath,
        cryptoProvider!,
        environmentManager.getLocalEnvName(),
        true
      );
      if (envDataResult.isOk()) {
        const envData = envDataResult.value as v3.EnvInfoV3;
        return envData;
      }
      return undefined;
    } else {
      return undefined;
    }
  }
}
