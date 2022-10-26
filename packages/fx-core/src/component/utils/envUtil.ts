import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import * as dotenv from "dotenv";
import * as path from "path";
import fs from "fs-extra";
import { merge } from "lodash";
import { settingsUtil } from "./settingsUtil";
import { LocalCrypto } from "../../core/crypto";

export async function readEnv(
  projectPath: string,
  env: string
): Promise<Result<Map<string, string>, FxError>> {
  const envPath = path.join(projectPath, ".fx", `.env.${env}`);
  const envs = dotenv.parse(await fs.readFile(envPath));
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
  merge(process.env, envs);
  const map = new Map<string, string>();
  for (const key of Object.keys(envs)) {
    map.set(key, envs[key]);
  }
  return ok(map);
}

export async function writeEnv(
  projectPath: string,
  env: string,
  map: Map<string, string>
): Promise<Result<undefined, FxError>> {
  const settingsRes = await settingsUtil.readSettings(projectPath);
  if (settingsRes.isErr()) {
    return err(settingsRes.error);
  }
  const projectId = settingsRes.value.projectId;
  const cryptoProvider = new LocalCrypto(projectId);
  const envPath = path.join(projectPath, ".fx", `.env.${env}`);
  const array: string[] = [];
  for (const key of map.keys()) {
    let value = map.get(key);
    if (value && key.startsWith("SECRET_")) {
      const res = await cryptoProvider.encrypt(value);
      if (res.isErr()) return err(res.error);
      value = res.value;
    }
    array.push(`${key}=${value}`);
  }
  const content = array.join("\n");
  await fs.writeFile(envPath, content);
  return ok(undefined);
}

export class EnvUtil {
  readEnv = readEnv;
  writeEnv = writeEnv;
}

export const envUtil = new EnvUtil();
