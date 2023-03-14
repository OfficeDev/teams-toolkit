import {
  err,
  FxError,
  InvalidInputError,
  ok,
  Result,
  SettingsFolderName,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import fs from "fs-extra";
import { yamlParser } from "../configManager/parser";
import { MetadataV3 } from "../../common/versionMetadata";
import { InvalidProjectError } from "../../error/common";

export const YmlFileNameOld = "app.yml";
export const LocalYmlFileNameOld = "app.local.yml";

export class PathUtils {
  getYmlFilePath(projectPath: string, env?: string): string {
    const envName = env || process.env.TEAMSFX_ENV;
    if (!envName) throw new InvalidInputError("util", "env", "env is undefined");
    let ymlPath = path.join(
      projectPath,
      envName === "local" ? MetadataV3.localConfigFile : MetadataV3.configFile
    );
    if (fs.pathExistsSync(ymlPath)) {
      return ymlPath;
    }
    ymlPath = path.join(
      projectPath,
      SettingsFolderName,
      envName === "local" ? LocalYmlFileNameOld : YmlFileNameOld
    );
    if (fs.pathExistsSync(ymlPath)) {
      return ymlPath;
    }
    throw new InvalidProjectError();
  }
  async getEnvFolderPath(projectPath: string): Promise<Result<string | undefined, FxError>> {
    const ymlFilePath = this.getYmlFilePath(projectPath, "dev");
    const parseRes = await yamlParser.parse(ymlFilePath);
    if (parseRes.isErr()) return err(parseRes.error);
    const projectModel = parseRes.value;
    if (!projectModel.environmentFolderPath) return ok(undefined); //err(new InvalidEnvFolderPath("missing field: environmentFolderPath"));
    const envFolderPath = path.isAbsolute(projectModel.environmentFolderPath)
      ? projectModel.environmentFolderPath
      : path.join(projectPath, projectModel.environmentFolderPath);
    if (!(await fs.pathExists(envFolderPath))) return ok(undefined); //err(new InvalidEnvFolderPath("environment folder not exist: " + envFolderPath));
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
