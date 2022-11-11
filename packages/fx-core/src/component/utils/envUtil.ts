import { err, FxError, ok, Result, SettingsFolderName, UserError } from "@microsoft/teamsfx-api";
import * as path from "path";
import fs from "fs-extra";
import { cloneDeep, merge, result } from "lodash";
import { settingsUtil } from "./settingsUtil";
import { LocalCrypto } from "../../core/crypto";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { deepCopy } from "../../common/tools";

export type DotenvOutput = {
  [k: string]: string;
};

export class EnvUtil {
  async readEnv(
    projectPath: string,
    env: string,
    loadToProcessEnv = true,
    silent = false
  ): Promise<Result<DotenvOutput, FxError>> {
    // read
    const dotEnvFilePath = path.join(projectPath, SettingsFolderName, `.env.${env}`);
    if (!(await fs.pathExists(dotEnvFilePath))) {
      if (silent) {
        return ok({});
      } else {
        return err(
          new UserError({
            source: "core",
            name: "DotEnvFileNotExistError",
            displayMessage: getLocalizedString("error.DotEnvFileNotExistError"),
            message: getDefaultString("error.DotEnvFileNotExistError"),
          })
        );
      }
    }
    // deserialize
    const parseResult = dotenvUtil.deserialize(await fs.readFile(dotEnvFilePath));

    // decrypt
    const settingsRes = await settingsUtil.readSettings(projectPath);
    if (settingsRes.isErr()) {
      return err(settingsRes.error);
    }
    const projectId = settingsRes.value.trackingId;
    const cryptoProvider = new LocalCrypto(projectId);
    for (const key of Object.keys(parseResult.obj)) {
      if (key.startsWith("SECRET_")) {
        const raw = parseResult.obj[key];
        const decryptRes = await cryptoProvider.decrypt(raw);
        if (decryptRes.isErr()) return err(decryptRes.error);
        parseResult.obj[key] = decryptRes.value;
      }
    }
    if (loadToProcessEnv) {
      merge(process.env, parseResult.obj);
    }
    return ok(parseResult.obj);
  }

  async writeEnv(
    projectPath: string,
    env: string,
    envs: DotenvOutput
  ): Promise<Result<undefined, FxError>> {
    //encrypt
    const settingsRes = await settingsUtil.readSettings(projectPath);
    if (settingsRes.isErr()) {
      return err(settingsRes.error);
    }
    const projectId = settingsRes.value.trackingId;
    const cryptoProvider = new LocalCrypto(projectId);
    for (const key of Object.keys(envs)) {
      let value = envs[key];
      if (value && key.startsWith("SECRET_")) {
        const res = await cryptoProvider.encrypt(value);
        if (res.isErr()) return err(res.error);
        value = res.value;
        envs[key] = value;
      }
    }

    //replace existing
    const dotEnvFilePath = path.join(projectPath, SettingsFolderName, `.env.${env}`);
    const parsedDotenv = (await fs.pathExists(dotEnvFilePath))
      ? dotenvUtil.deserialize(await fs.readFile(dotEnvFilePath))
      : { obj: {} };
    parsedDotenv.obj = envs;

    //serialize
    const content = dotenvUtil.serialize(parsedDotenv);

    //persist
    await fs.writeFile(dotEnvFilePath, content);

    return ok(undefined);
  }
  async listEnv(projectPath: string): Promise<Result<string[], FxError>> {
    const folder = path.join(projectPath, SettingsFolderName);
    const list = await fs.readdir(folder);
    const envs = list
      .filter((fileName) => fileName.startsWith(".env."))
      .map((fileName) => fileName.substring(5));
    return ok(envs);
  }
  object2map(obj: DotenvOutput): Map<string, string> {
    const map = new Map<string, string>();
    for (const key of Object.keys(obj)) {
      map.set(key, obj[key]);
    }
    return map;
  }
  map2object(map: Map<string, string>): DotenvOutput {
    const obj: DotenvOutput = {};
    for (const key of map.keys()) {
      obj[key] = map.get(key) || "";
    }
    return obj;
  }
}

export const envUtil = new EnvUtil();

const NEWLINE = "\n";
const RE_INI_KEY_VAL = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
const RE_NEWLINES = /\\n/g;
const NEWLINES_MATCH = /\n|\r|\r\n/;

type DotenvParsedLine = string | { key: string; value: string };
export interface DotenvParseResult {
  lines?: DotenvParsedLine[];
  obj: DotenvOutput;
}

export class DotenvUtil {
  deserialize(src: string | Buffer): DotenvParseResult {
    const lines: DotenvParsedLine[] = [];
    const obj: DotenvOutput = {};
    // convert Buffers before splitting into lines and processing
    src
      .toString()
      .split(NEWLINES_MATCH)
      .forEach(function (line, idx) {
        // matching "KEY' and 'VAL' in 'KEY=VAL'
        const keyValueArr = line.match(RE_INI_KEY_VAL);
        // matched?
        if (keyValueArr != null) {
          const key = keyValueArr[1];
          // default undefined or missing values to empty string
          let val = keyValueArr[2] || "";
          const end = val.length - 1;
          const isDoubleQuoted = val[0] === '"' && val[end] === '"';
          const isSingleQuoted = val[0] === "'" && val[end] === "'";

          // if single or double quoted, remove quotes
          if (isSingleQuoted || isDoubleQuoted) {
            val = val.substring(1, end);

            // if double quoted, expand newlines
            if (isDoubleQuoted) {
              val = val.replace(RE_NEWLINES, NEWLINE);
            }
          } else {
            // remove surrounding whitespace
            val = val.trim();
          }
          obj[key] = val;
          lines.push({ key: key, value: val });
        } else {
          lines.push(line);
        }
      });
    return { lines: lines, obj: obj };
  }
  serialize(parsed: DotenvParseResult): string {
    const array: string[] = [];
    const obj = cloneDeep(parsed.obj);
    if (parsed.lines) {
      parsed.lines.forEach((line) => {
        if (typeof line === "string") {
          // keep comment line or empty line
          array.push(line);
        } else {
          if (obj[line.key] !== undefined) {
            array.push(`${line.key}=${obj[line.key]}`);
            delete obj[line.key]; //remove the key that already appended
          }
        }
      });
    }
    //append additional keys
    for (const key of Object.keys(obj)) {
      array.push(`${key}=${parsed.obj[key]}`);
    }
    return array.join("\n").trim();
  }
}

export const dotenvUtil = new DotenvUtil();
// const res = dotenvUtil.deserialize("#COMMENT\n\r\nKEY=VALUE");
// console.log(res);
// res.obj["KEY"] = "VALUE@@@";
// console.log(dotenvUtil.serialize(res));
