// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigFolderName,
  CryptoProvider,
  err,
  FxError,
  Json,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import path from "path";
import fs from "fs-extra";
import { deserializeDict, dataNeedEncryption, mergeSerectData, PathNotExistError } from "..";

export interface EnvInfo {
  envName: string;
  data: Json;
}

export interface EnvFiles {
  envProfile: string;
  userDataFile: string;
}

class EnvironmentManager {
  private readonly defaultEnvName = "default";

  public async loadEnvProfile(
    projectPath: string,
    envName?: string,
    cryptoProvider?: CryptoProvider
  ): Promise<Result<EnvInfo, FxError>> {
    if (!(await fs.pathExists(projectPath))) {
      return err(PathNotExistError(projectPath));
    }

    envName = envName ?? this.defaultEnvName;
    const envFiles = this.getEnvFilesPath(envName, projectPath);
    const userDataResult = await this.loadUserData(envFiles.userDataFile, cryptoProvider);
    if (userDataResult.isErr()) {
      return err(userDataResult.error);
    }
    const userData = userDataResult.value;

    if (!(await fs.pathExists(envFiles.envProfile))) {
      // TODO: handle the case that env file profile doesn't exist.
      return err(PathNotExistError(envFiles.envProfile));
    }
    const data = await fs.readJson(envFiles.envProfile);

    mergeSerectData(userData, data);
    return ok({ envName, data });
  }

  public getEnvFilesPath(envName: string, projectPath: string): EnvFiles {
    const basePath = path.resolve(projectPath, `.${ConfigFolderName}`);
    const envProfile = path.resolve(basePath, `env.${envName}.json`);
    const userDataFile = path.resolve(basePath, `${envName}.userdata`);

    return { envProfile, userDataFile };
  }

  private async loadUserData(
    userDataPath: string,
    cryptoProvider?: CryptoProvider
  ): Promise<Result<Record<string, string>, FxError>> {
    if (!(await fs.pathExists(userDataPath))) {
      return ok({});
    }

    const content = await fs.readFile(userDataPath, "UTF-8");
    const data = deserializeDict(content);
    if (!cryptoProvider) {
      return ok(data);
    }

    for (const secretKey of Object.keys(data)) {
      if (!dataNeedEncryption(secretKey)) {
        continue;
      }

      const secretValue = data[secretKey];
      const plaintext = cryptoProvider.decrypt(secretValue);
      if (plaintext.isErr()) {
        return err(plaintext.error);
      }

      data[secretKey] = plaintext.value;
    }

    return ok(data);
  }
}

export const environmentManager = new EnvironmentManager();
