// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import fs from "fs-extra";
import * as path from "path";
import { MetadataV3 } from "../../common/versionMetadata";
import { MissingRequiredFileError, MissingRequiredInputError } from "../../error/common";
import { yamlParser } from "../configManager/parser";
import { environmentNameManager } from "../../core/environmentName";

class PathUtils {
  getYmlFilePath(projectPath: string, env?: string): string {
    if (process.env.TEAMSFX_CONFIG_FILE_PATH) return process.env.TEAMSFX_CONFIG_FILE_PATH;
    const envName = env || process.env.TEAMSFX_ENV || "dev";
    if (!envName) throw new MissingRequiredInputError("env", "PathUtils");
    const ymlPath = path.join(
      projectPath,
      envName === environmentNameManager.getLocalEnvName()
        ? MetadataV3.localConfigFile
        : envName === environmentNameManager.getTestToolEnvName()
        ? MetadataV3.testToolConfigFile
        : MetadataV3.configFile
    );
    if (fs.pathExistsSync(ymlPath)) {
      return ymlPath;
    }
    if (environmentNameManager.isRemoteEnvironment(envName)) {
      throw new MissingRequiredFileError("core", "", ymlPath);
    } else {
      throw new MissingRequiredFileError("core", "Debug ", ymlPath);
    }
  }
  async getEnvFolderPath(projectPath: string): Promise<Result<string | undefined, FxError>> {
    const ymlFilePath = this.getYmlFilePath(projectPath, "dev");
    const parseRes = await yamlParser.parse(ymlFilePath);
    if (parseRes.isErr()) return err(parseRes.error);
    const projectModel = parseRes.value;
    if (!projectModel.environmentFolderPath) projectModel.environmentFolderPath = "./env";
    const envFolderPath = path.isAbsolute(projectModel.environmentFolderPath)
      ? projectModel.environmentFolderPath
      : path.join(projectPath, projectModel.environmentFolderPath);
    if (!(await fs.pathExists(envFolderPath))) return ok(undefined);
    return ok(envFolderPath);
  }
  async getEnvFilePath(
    projectPath: string,
    env: string
  ): Promise<Result<string | undefined, FxError>> {
    const envFolderPathRes = await this.getEnvFolderPath(projectPath);
    if (envFolderPathRes.isErr()) return err(envFolderPathRes.error);
    const folderPath = envFolderPathRes.value;
    if (!folderPath) return ok(undefined);
    const envFilePath = path.join(folderPath, `.env.${env}`);
    return ok(envFilePath);
  }
}

export const pathUtils = new PathUtils();
