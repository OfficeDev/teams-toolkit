import { FxError, ok, Result } from "@microsoft/teamsfx-api";
import { FxCore } from "../../core/FxCore";
import * as dotenv from "dotenv";
import * as path from "path";
import fs from "fs-extra";
import { merge } from "lodash";

export async function readEnv(
  projectPath: string,
  env: string
): Promise<Result<Map<string, string>, FxError>> {
  const envPath = path.join(projectPath, ".fx", `.env.${env}`);
  const envs = dotenv.parse(await fs.readFile(envPath));
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
): Promise<Result<undefined, FxCore>> {
  const envPath = path.join(projectPath, ".fx", `.env.${env}`);
  const array: string[] = [];
  for (const key of map.keys()) {
    const value = map.get(key);
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
