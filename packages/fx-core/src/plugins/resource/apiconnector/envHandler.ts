// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { LocalEnvProvider, LocalEnvs } from "../../../common/local/localEnvProvider";
import { ApiConnectorConfiguration } from "./utils";
import { ApiManager } from "./apiManager";
import { ApiConnectorResult, ResultFactory } from "./result";
import { ProjectType } from "./constants";
import { ErrorMessage } from "./errors";
export class EnvHandler {
  public static readonly LocalEnvFileName: string = ".env.teamsfx.local";
  private readonly projectRoot: string;
  private readonly serviceType: ProjectType;
  private apiManager: ApiManager;

  constructor(workspaceFolder: string, serviceType: ProjectType) {
    this.projectRoot = workspaceFolder;
    this.serviceType = serviceType;
    this.apiManager = new ApiManager();
  }

  public updateEnvs(config: ApiConnectorConfiguration) {
    this.apiManager.addApiEnvs(config);
  }

  public async saveLocalEnvFile(): Promise<ApiConnectorResult> {
    // backup .env.teamsfx.local file with timestamp
    const timestamp = Date.now();
    const backupFileName: string = EnvHandler.LocalEnvFileName + "." + timestamp;
    const srcFile = path.join(this.projectRoot, this.serviceType, EnvHandler.LocalEnvFileName);
    const tmpFile = path.join(this.projectRoot, this.serviceType, backupFileName);
    if (!(await fs.pathExists(srcFile))) {
      await fs.createFile(srcFile);
    }
    await fs.move(srcFile, tmpFile);
    // update localEnvs
    try {
      const provider: LocalEnvProvider = new LocalEnvProvider(this.projectRoot);
      if (this.serviceType === ProjectType.BOT) {
        let localEnvsBot: LocalEnvs = await provider.loadBotLocalEnvs();
        localEnvsBot = this.updateLocalApiEnvs(localEnvsBot);
        await provider.saveLocalEnvs(undefined, undefined, localEnvsBot);
      } else if (this.serviceType === ProjectType.API) {
        let localEnvsBE: LocalEnvs = await provider.loadBackendLocalEnvs();
        localEnvsBE = this.updateLocalApiEnvs(localEnvsBE);
        await provider.saveLocalEnvs(undefined, localEnvsBE, undefined);
      }
    } catch (err) {
      await fs.move(tmpFile, srcFile);
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorFileCreateFailError.name,
        ErrorMessage.ApiConnectorFileCreateFailError.message(srcFile)
      );
    } finally {
      await fs.remove(tmpFile);
    }
    return ResultFactory.Success();
  }

  private updateLocalApiEnvs(localEnvs: LocalEnvs): LocalEnvs {
    const res: LocalEnvs = this.apiManager.updateLocalApiEnvs(localEnvs);
    return res;
  }
}
