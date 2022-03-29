// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import {
  ConfigFolderName,
  CryptoProvider,
  Json,
  StatesFolderName,
  v3,
} from "@microsoft/teamsfx-api";
import { environmentManager } from "../core/environment";

export const localStateFileName = "state.local.json";

export class LocalStateProvider {
  public readonly projectPath: string;
  public readonly localStateFilePath: string;
  constructor(workspaceFolder: string) {
    this.projectPath = `${workspaceFolder}`;
    this.localStateFilePath = `${workspaceFolder}/.${ConfigFolderName}/${StatesFolderName}/${localStateFileName}`;
  }

  public async loadV2(
    cryptoProvider?: CryptoProvider,
    includeAAD?: boolean
  ): Promise<Json | undefined> {
    if (await fs.pathExists(this.localStateFilePath)) {
      const envDataResult = await environmentManager.loadEnvInfo(
        this.projectPath,
        cryptoProvider!,
        environmentManager.getLocalEnvName(),
        true
      );

      if (envDataResult.isOk()) {
        const envData = envDataResult.value as v3.EnvInfoV3;
        return envData.state as Json;
      }
      return undefined;
    } else {
      return undefined;
    }
  }
}
