// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { LocalEnvProvider, LocalEnvs } from "../../../common/local/localEnvProvider";
import { ApiConnectorConfiguration } from "./utils";
import { ApiManager } from "./apiManager";
export class EnvHandler {
  public static readonly LocalEnvFileName: string = ".env.teamsfx.local";
  private readonly projectRoot: string;
  private readonly serviceType: string;
  private apiManager: ApiManager;

  constructor(workspaceFolder: string, serviceType: string) {
    this.projectRoot = workspaceFolder;
    this.serviceType = serviceType;
    this.apiManager = new ApiManager();
  }

  public updateEnvs(config: ApiConnectorConfiguration) {
    this.apiManager.addApiConfig(config);
  }

  public async scaffoldSampleCode() {}

  public async saveLocalEnvFile() {
    // backup .env.teamsfx.local file with timestamp
    const timestamp = Date.now();
    const backupFileName: string = EnvHandler.LocalEnvFileName + "." + timestamp;
    const srcFile = path.join(this.projectRoot, this.serviceType, EnvHandler.LocalEnvFileName);
    const tarFile = path.join(this.projectRoot, this.serviceType, backupFileName);
    if (!(await fs.pathExists(srcFile))) {
      await fs.createFile(srcFile);
    }
    await fs.move(srcFile, tarFile);
    // update localEnvs
    try {
      const provider: LocalEnvProvider = new LocalEnvProvider(this.projectRoot);
      if (this.serviceType === "bot") {
        let localEnvsBot: LocalEnvs = await provider.loadBotLocalEnvs();
        localEnvsBot = this.handleProjectEnvs(localEnvsBot);
        await provider.saveLocalEnvs(undefined, undefined, localEnvsBot);
      } else {
        let localEnvsBE: LocalEnvs = await provider.loadBackendLocalEnvs();
        localEnvsBE = this.handleProjectEnvs(localEnvsBE);
        await provider.saveLocalEnvs(undefined, localEnvsBE, undefined);
      }
    } catch (err) {
      await fs.move(tarFile, srcFile);
    } finally {
      await fs.remove(tarFile);
    }
  }

  private handleProjectEnvs(localEnvs: LocalEnvs): LocalEnvs {
    const res: LocalEnvs = this.apiManager.updateServerEnvs(localEnvs);
    return res;
  }
}
