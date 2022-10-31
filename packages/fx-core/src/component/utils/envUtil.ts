import { err, FxError, ok, Result, UserError } from "@microsoft/teamsfx-api";
import * as dotenv from "dotenv";
import * as path from "path";
import fs from "fs-extra";
import { merge } from "lodash";
import { settingsUtil } from "./settingsUtil";
import { LocalCrypto } from "../../core/crypto";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";

export class EnvUtil {
  async readEnv(
    projectPath: string,
    env: string,
    loadToProcessEnv = true
  ): Promise<Result<dotenv.DotenvParseOutput, FxError>> {
    const dotEnvFilePath = path.join(projectPath, ".fx", `.env.${env}`);
    if (!(await fs.pathExists(dotEnvFilePath))) {
      return err(
        new UserError({
          source: "core",
          name: "DotEnvFileNotExistError",
          displayMessage: getLocalizedString("error.DotEnvFileNotExistError"),
          message: getDefaultString("error.DotEnvFileNotExistError"),
        })
      );
    }
    const envs = dotenv.parse(await fs.readFile(dotEnvFilePath));
    const settingsRes = await settingsUtil.readSettings(projectPath);
    if (settingsRes.isErr()) {
      return err(settingsRes.error);
    }
    const projectId = settingsRes.value.projectId;
    const cryptoProvider = new LocalCrypto(projectId);
    for (const key of Object.keys(envs)) {
      if (key.startsWith("SECRET_")) {
        const raw = envs[key];
        const decryptRes = await cryptoProvider.decrypt(raw);
        if (decryptRes.isErr()) return err(decryptRes.error);
        envs[key] = decryptRes.value;
      }
    }
    if (loadToProcessEnv) {
      merge(process.env, envs);
    }
    return ok(envs);
  }

  async writeEnv(
    projectPath: string,
    env: string,
    envs: dotenv.DotenvParseOutput
  ): Promise<Result<undefined, FxError>> {
    const settingsRes = await settingsUtil.readSettings(projectPath);
    if (settingsRes.isErr()) {
      return err(settingsRes.error);
    }
    const projectId = settingsRes.value.projectId;
    const cryptoProvider = new LocalCrypto(projectId);
    const dotEnvFilePath = path.join(projectPath, ".fx", `.env.${env}`);
    const readEnvRes = await this.readEnv(projectPath, env);
    const existingEnvs = readEnvRes.isOk() ? readEnvRes.value : {};
    merge(existingEnvs, envs);
    const array: string[] = [];
    for (const key of Object.keys(existingEnvs)) {
      let value = existingEnvs[key];
      if (value && key.startsWith("SECRET_")) {
        const res = await cryptoProvider.encrypt(value);
        if (res.isErr()) return err(res.error);
        value = res.value;
      }
      array.push(`${key}=${value}`);
    }
    const content = array.join("\n");
    await fs.writeFile(dotEnvFilePath, content);
    return ok(undefined);
  }
  async listEnv(projectPath: string): Promise<Result<string[], FxError>> {
    const folder = path.join(projectPath, ".fx");
    const list = await fs.readdir(folder);
    const envs = list
      .filter((fileName) => fileName.startsWith(".env."))
      .map((fileName) => fileName.substring(5));
    return ok(envs);
  }
  object2map(obj: dotenv.DotenvParseOutput): Map<string, string> {
    const map = new Map<string, string>();
    for (const key of Object.keys(obj)) {
      map.set(key, obj[key]);
    }
    return map;
  }
  map2object(map: Map<string, string>): dotenv.DotenvParseOutput {
    const obj: dotenv.DotenvParseOutput = {};
    for (const key of map.keys()) {
      obj[key] = map.get(key) || "";
    }
    return obj;
  }
}

export const envUtil = new EnvUtil();
