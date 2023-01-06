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
import { InvalidEnvFolderPath } from "../configManager/error";

export const YmlFileNameOld = "app.yml";
export const LocalYmlFileNameOld = "app.local.yml";
export const YmlFileName = "teamsapp.yml";
export const LocalYmlFileName = "teamsapp.local.yml";

export class PathUtils {
  getYmlFilePath(projectPath: string, env?: string): string {
    const envName = env || process.env.TEAMSFX_ENV;
    if (!envName) throw new InvalidInputError("util", "env");
    let ymlPath = path.join(projectPath, envName === "local" ? LocalYmlFileName : YmlFileName);
    if (fs.pathExistsSync(ymlPath)) {
      return ymlPath;
    }
    ymlPath = path.join(
      projectPath,
      SettingsFolderName,
      envName === "local" ? YmlFileNameOld : LocalYmlFileNameOld
    );
    return ymlPath;
  }
  async getEnvFolderPath(projectPath: string): Promise<Result<string, FxError>> {
    const ymlFilePath = this.getYmlFilePath(projectPath, "dev");
    const parseRes = await yamlParser.parse(ymlFilePath);
    if (parseRes.isErr()) return err(parseRes.error);
    const projectModel = parseRes.value;
    if (!projectModel.environmentFolderPath)
      return err(new InvalidEnvFolderPath("missing field: environmentFolderPath"));
    const envFolderPath = path.isAbsolute(projectModel.environmentFolderPath)
      ? path.resolve(projectModel.environmentFolderPath)
      : path.join(projectPath, projectModel.environmentFolderPath);
    if (!(await fs.pathExists(envFolderPath)))
      return err(new InvalidEnvFolderPath("environment folder not exist: " + envFolderPath));
    return ok(envFolderPath);
  }
  async getEnvFilePath(projectPath: string, env: string): Promise<Result<string, FxError>> {
    const envFolderPathRes = await this.getEnvFolderPath(projectPath);
    if (envFolderPathRes.isErr()) return err(envFolderPathRes.error);
    const folderPath = envFolderPathRes.value;
    const envFilePath = path.join(folderPath, `.env.${env}`);
    return ok(envFilePath);
  }
}

export const pathUtils = new PathUtils();
