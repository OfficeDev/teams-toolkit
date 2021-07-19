// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import fs from "fs-extra";
import path from "path";
import { Options } from "yargs";
import chalk from "chalk";
import * as uuid from "uuid";
import * as dotenv from "dotenv";
import {
  OptionItem,
  Question,
  err,
  ok,
  Result,
  FxError,
  ConfigFolderName,
  getSingleOption,
  SingleSelectQuestion,
  MultiSelectQuestion,
  QTreeNode,
  Inputs,
  Platform,
  Colors,
} from "@microsoft/teamsfx-api";

import { ConfigNotFoundError, ReadFileError } from "./error";
import AzureAccountManager from "./commonlib/azureLogin";

export function getChoicesFromQTNodeQuestion(data: Question): string[] | undefined {
  const option = "staticOptions" in data ? data.staticOptions : undefined;
  if (option && option instanceof Array && option.length > 0) {
    if (typeof option[0] === "string") {
      return option as string[];
    } else {
      return (option as OptionItem[]).map((op) => (op.cliName ? op.cliName : op.id));
    }
  } else {
    return undefined;
  }
}

export function getSingleOptionString(
  q: SingleSelectQuestion | MultiSelectQuestion
): string | string[] {
  const singleOption = getSingleOption(q);
  if (q.returnObject) {
    if (q.type === "singleSelect") {
      return typeof singleOption === "string" ? singleOption : singleOption.id;
    } else {
      return [singleOption[0].id];
    }
  } else {
    return singleOption;
  }
}

export function toYargsOptions(data: Question): Options {
  const choices = getChoicesFromQTNodeQuestion(data);
  // if (choices && choices.length > 0 && data.default === undefined) {
  //   data.default = choices[0];
  // }

  const defaultValue = data.default;
  if (defaultValue && defaultValue instanceof Array && defaultValue.length > 0) {
    data.default = defaultValue.map((item) => item.toLocaleLowerCase());
  } else if (defaultValue && typeof defaultValue === "string") {
    data.default = defaultValue.toLocaleLowerCase();
  }
  if (data.default === undefined) {
    return {
      array: data.type === "multiSelect",
      description: data.title || "",
      choices: choices,
      hidden: !!(data as any).hide,
      global: false,
      type: "string",
    };
  }
  return {
    array: data.type === "multiSelect",
    description: data.title || "",
    default: data.default,
    choices: choices,
    hidden: !!(data as any).hide,
    global: false,
    type: "string",
  };
}

export function flattenNodes(node: QTreeNode): QTreeNode[] {
  const nodeCopy = Object.assign({}, node);
  const children = (nodeCopy.children || []).concat([]);
  nodeCopy.children = undefined;
  return [nodeCopy].concat(...children.map((nd) => flattenNodes(nd)));
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// TODO
export function getActiveEnv(): string {
  return "default";
}

export function getConfigPath(rootfolder: string): string {
  return `${rootfolder}/.${ConfigFolderName}/env.${getActiveEnv()}.json`;
}

export async function readConfigs(rootfolder: string): Promise<Result<any, FxError>> {
  // TODO: change the dirname to teamsFx for monorepo
  const filePath = getConfigPath(rootfolder);
  if (!fs.existsSync(filePath)) {
    return err(ConfigNotFoundError(filePath));
  }
  try {
    const config = await fs.readJson(filePath);
    return ok(config);
  } catch (e) {
    return err(ReadFileError(e));
  }
}

export async function readProjectSecrets(rootFolder: string): Promise<dotenv.DotenvParseOutput> {
  const secretFile = `${rootFolder}/.${ConfigFolderName}/${getActiveEnv()}.userdata`;
  const secretData = await fs.readFile(secretFile);
  const result = dotenv.parse(secretData);
  return result;
}

export function writeSecretToFile(secrets: dotenv.DotenvParseOutput, rootFolder: string): void {
  const secretFile = `${rootFolder}/.${ConfigFolderName}/${getActiveEnv()}.userdata`;
  const array: string[] = [];
  for (const secretKey of Object.keys(secrets)) {
    const secretValue = secrets[secretKey];
    array.push(`${secretKey}=${secretValue}`);
  }
  fs.writeFileSync(secretFile, array.join("\n"));
}

export async function getSubscriptionIdFromEnvFile(
  rootfolder: string
): Promise<string | undefined> {
  const result = await readConfigs(rootfolder);
  if (result.isErr()) {
    throw result.error;
  }
  const configJson = result.value;
  return configJson["solution"].subscriptionId as string | undefined;
}

export async function setSubscriptionId(
  subscriptionId?: string,
  rootFolder = "./"
): Promise<Result<null, FxError>> {
  if (subscriptionId) {
    const result = await readConfigs(rootFolder);
    if (result.isErr()) {
      return err(result.error);
    }

    await AzureAccountManager.setSubscription(subscriptionId);
    const subs = await AzureAccountManager.listSubscriptions();
    const sub = subs.find((sub) => sub.subscriptionId === subscriptionId);

    const configJson = result.value;
    configJson["solution"].subscriptionId = sub?.subscriptionId;
    configJson["solution"].tenantId = sub?.tenantId;
    await fs.writeFile(getConfigPath(rootFolder), JSON.stringify(configJson, null, 4));
  }
  return ok(null);
}

export function isWorkspaceSupported(workspace: string): boolean {
  const p = workspace;

  const checklist: string[] = [
    p,
    `${p}/package.json`,
    `${p}/.${ConfigFolderName}`,
    `${p}/.${ConfigFolderName}/settings.json`,
    `${p}/.${ConfigFolderName}/env.${getActiveEnv()}.json`,
  ];

  for (const fp of checklist) {
    if (!fs.pathExistsSync(path.resolve(fp))) {
      return false;
    }
  }
  return true;
}

export function getTeamsAppId(rootfolder: string | undefined): any {
  if (!rootfolder) {
    return undefined;
  }

  if (isWorkspaceSupported(rootfolder)) {
    const env = getActiveEnv();
    const envJsonPath = path.join(rootfolder, `.${ConfigFolderName}/env.${env}.json`);
    const envJson = JSON.parse(fs.readFileSync(envJsonPath, "utf8"));
    return envJson.solution.remoteTeamsAppId;
  }

  return undefined;
}

export function getLocalTeamsAppId(rootfolder: string | undefined): any {
  if (!rootfolder) {
    return undefined;
  }

  if (isWorkspaceSupported(rootfolder)) {
    const env = getActiveEnv();
    const envJsonPath = path.join(rootfolder, `.${ConfigFolderName}/env.${env}.json`);
    const envJson = JSON.parse(fs.readFileSync(envJsonPath, "utf8"));
    return envJson.solution.localDebugTeamsAppId;
  }

  return undefined;
}

export function getSystemInputs(projectPath?: string): Inputs {
  const systemInputs: Inputs = {
    platform: Platform.CLI,
    projectPath: projectPath,
    correlationId: uuid.v4(),
  };
  return systemInputs;
}

export function argsToInputs(
  params: { [_: string]: Options },
  args: { [argName: string]: string | string[] }
): Inputs {
  const inputs = getSystemInputs();
  for (const name in params) {
    if (name.endsWith("folder") && args[name]) {
      inputs[name] = path.resolve(args[name] as string);
    } else {
      inputs[name] = args[name];
    }
  }
  const rootFolder = path.resolve((inputs["folder"] as string) || "./");
  delete inputs["folder"];
  inputs.projectPath = rootFolder;
  return inputs;
}

export function getColorizedString(message: Array<{ content: string; color: Colors }>): string {
  // Color support is automatically detected by chalk
  const colorizedMessage = message
    .map((item) => {
      switch (item.color) {
        case Colors.BRIGHT_WHITE:
          return chalk.whiteBright(item.content);
        case Colors.WHITE:
          return chalk.white(item.content);
        case Colors.BRIGHT_MAGENTA:
          return chalk.magentaBright(item.content);
        case Colors.BRIGHT_GREEN:
          return chalk.greenBright(item.content);
        case Colors.BRIGHT_RED:
          return chalk.redBright(item.content);
        case Colors.BRIGHT_YELLOW:
          return chalk.yellowBright(item.content);
        case Colors.BRIGHT_CYAN:
          return chalk.cyanBright.underline(item.content);
        default:
          return item.content;
      }
    })
    .join("");
  return colorizedMessage + (process.stdout.isTTY ? "\u00A0\u001B[K" : "");
}

/**
 * Shows in `teamsfx -v`.
 * @returns the version of teamsfx-cli.
 */
export function getVersion(): string {
  const pkgPath = path.resolve(__dirname, "..", "package.json");
  const pkgContent = fs.readJsonSync(pkgPath);
  return pkgContent.version;
}
