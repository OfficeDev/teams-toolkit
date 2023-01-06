import { err, FxError, ok, Result, SettingsFolderName, UserError } from "@microsoft/teamsfx-api";
import * as path from "path";
import fs from "fs-extra";
import { cloneDeep, merge } from "lodash";
import { settingsUtil } from "./settingsUtil";
import { LocalCrypto } from "../../core/crypto";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { pathUtils } from "./pathUtils";

export type DotenvOutput = {
  [k: string]: string;
};

export class EnvUtil {
  async getEnvFilePath(projectPath: string, env: string) {}
  async readEnv(
    projectPath: string,
    env: string,
    loadToProcessEnv = true,
    silent = false
  ): Promise<Result<DotenvOutput, FxError>> {
    // read
    const dotEnvFilePathRes = await pathUtils.getEnvFilePath(projectPath, env);
    if (dotEnvFilePathRes.isErr()) return err(dotEnvFilePathRes.error);
    const dotEnvFilePath = dotEnvFilePathRes.value;
    if (!(await fs.pathExists(dotEnvFilePath))) {
      if (silent) {
        return ok({});
      } else {
        return err(
          new UserError({
            source: "core",
            name: "DotEnvFileNotExistError",
            displayMessage: getLocalizedString("error.DotEnvFileNotExistError", env, env),
            message: getDefaultString("error.DotEnvFileNotExistError", env, env),
          })
        );
      }
    }
    // deserialize
    const parseResult = dotenvUtil.deserialize(
      await fs.readFile(dotEnvFilePath, { encoding: "utf8" })
    );

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
        if (raw.startsWith("crypto_")) {
          const decryptRes = await cryptoProvider.decrypt(raw);
          if (decryptRes.isErr()) return err(decryptRes.error);
          parseResult.obj[key] = decryptRes.value;
        }
      }
    }
    parseResult.obj.TEAMSFX_ENV = env;
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
    const dotEnvFilePathRes = await pathUtils.getEnvFilePath(projectPath, env);
    if (dotEnvFilePathRes.isErr()) return err(dotEnvFilePathRes.error);
    const dotEnvFilePath = dotEnvFilePathRes.value;
    const parsedDotenv = (await fs.pathExists(dotEnvFilePath))
      ? dotenvUtil.deserialize(await fs.readFile(dotEnvFilePath))
      : { obj: {} };
    parsedDotenv.obj = envs;

    //serialize
    const content = dotenvUtil.serialize(parsedDotenv);

    //persist
    await fs.writeFile(dotEnvFilePath, content, { encoding: "utf8" });

    return ok(undefined);
  }
  async listEnv(projectPath: string): Promise<Result<string[], FxError>> {
    const folderRes = await pathUtils.getEnvFolderPath(projectPath);
    if (folderRes.isErr()) return err(folderRes.error);
    const folder = folderRes.value;
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

const KEY_VALUE_PAIR_RE = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;
const NEW_LINE_RE = /\\n/g;
const NEW_LINE_SPLITTER = /\r?\n/;
const NEW_LINE = "\n";
type DotenvParsedLine =
  | string
  | { key: string; value: string; comment?: string; quote?: '"' | "'" };
export interface DotenvParseResult {
  lines?: DotenvParsedLine[];
  obj: DotenvOutput;
}

export class DotenvUtil {
  deserialize(src: string | Buffer): DotenvParseResult {
    const lines: DotenvParsedLine[] = [];
    const obj: DotenvOutput = {};
    const stringLines = src.toString().split(NEW_LINE_SPLITTER);
    for (const line of stringLines) {
      const kvMatchArray = line.match(KEY_VALUE_PAIR_RE);
      if (kvMatchArray !== null) {
        // match key-value pair
        const key = kvMatchArray[1];
        let value = kvMatchArray[2] || "";
        let inlineComment;
        const dQuoted = value[0] === '"' && value[value.length - 1] === '"';
        const sQuoted = value[0] === "'" && value[value.length - 1] === "'";
        let quote: '"' | "'" | undefined = undefined;
        if (sQuoted || dQuoted) {
          quote = dQuoted ? '"' : "'";
          value = value.substring(1, value.length - 1);
          if (dQuoted) {
            value = value.replace(NEW_LINE_RE, NEW_LINE);
          }
        } else {
          value = value.trim();
          //try to match comment starter
          const index = value.indexOf("#");
          if (index >= 0) {
            inlineComment = value.substring(index);
            value = value.substring(0, index).trim();
          }
        }
        if (value) obj[key] = value;
        const parsedLine: DotenvParsedLine = { key: key, value: value };
        if (inlineComment) parsedLine.comment = inlineComment;
        if (quote) parsedLine.quote = quote;
        lines.push(parsedLine);
      } else {
        lines.push(line);
      }
    }
    return { lines: lines, obj: obj };
  }
  serialize(parsed: DotenvParseResult): string {
    const array: string[] = [];
    const obj = cloneDeep(parsed.obj);
    //append lines
    if (parsed.lines) {
      parsed.lines.forEach((line) => {
        if (typeof line === "string") {
          // keep comment line or empty line
          array.push(line);
        } else {
          if (obj[line.key] !== undefined) {
            // use kv in obj
            line.value = obj[line.key];
            delete obj[line.key];
          }
          if (line.value.includes("#")) {
            // if value contains '#', need add quote
            line.quote = '"';
          }
          array.push(
            `${line.key}=${line.quote ? line.quote + line.value + line.quote : line.value}${
              line.comment ? " " + line.comment : ""
            }`
          );
        }
      });
    }
    //append additional kvs in object
    for (const key of Object.keys(obj)) {
      let value = parsed.obj[key];
      if (value.includes("#")) value = `"${value}"`; // if value contains '#', need add quote
      array.push(`${key}=${value}`);
    }
    return array.join("\n").trim();
  }
}

export const dotenvUtil = new DotenvUtil();
// const original = `# Built-in environment variables
// TEAMSFX_ENV=dev2
// AZURE_SUBSCRIPTION_ID=
// AZURE_RESOURCE_GROUP_NAME=
// RESOURCE_SUFFIX=

// # Generated during provision, you can also add your own variables. If you're adding a secret value, add SECRET_ prefix to the name so Teams Toolkit can handle them properly
// BOT_ID=
// SECRET_BOT_PASSWORD=
// TEAMS_APP_ID=
// BOT_AZURE_FUNCTION_APP_RESOURCE_ID=
// BOT_DOMAIN=
// BOT_FUNCTION_ENDPOINT=
// TEAMS_APP_TENANT_ID=
// `;

// const parsed = dotenvUtil.deserialize(original);
// console.log(parsed)
