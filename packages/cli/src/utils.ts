// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import fs from "fs-extra";
import path from "path";
import { Options } from "yargs";

import {
  NodeType,
  QTreeNode,
  OptionItem,
  Question,
  err,
  ok,
  Result,
  FxError,
  ConfigFolderName,
  ConfigMap,
  isAutoSkipSelect,
  getSingleOption,
  SingleSelectQuestion,
  MultiSelectQuestion,
} from "fx-api";

import { ConfigNotFoundError, ReadFileError } from "./error";
import AzureAccountManager from "./commonlib/azureLogin";

export function getJson<T>(jsonFilePath: string): T | undefined {
  if (jsonFilePath && fs.existsSync(jsonFilePath)) {
    return require(path.resolve(jsonFilePath));
  }
  return undefined;
}

export function getParamJson(jsonFilePath: string): { [_: string]: Options } {
  const jsonContent = getJson<QTreeNode[]>(jsonFilePath);
  if (jsonContent === undefined) {
    return {};
  } else {
    const params: { [_: string]: Options } = {};
    jsonContent.forEach((node) => {
      const data = node.data as Question;
      if (isAutoSkipSelect(data)) {
        // set the only option to default value so yargs will auto fill it.
        data.default = getSingleOptionString(data as (SingleSelectQuestion | MultiSelectQuestion));
        (data as any).hide = true;
      }
      params[data.name] = toYargsOptions(data);
    });
    return params;
  }
}

export function getChoicesFromQTNodeQuestion(data: Question, interactive = false): string[] | undefined {
  const option = "option" in data ? data.option : undefined;
  if (option && option instanceof Array && option.length > 0) {
    if (typeof option[0] === "string") {
      return option as string[];
    } else {
      if (interactive) {
        return (option as OptionItem[]).map(op => op.label);
      } else {
        return (option as OptionItem[]).map(op => op.cliName ? op.cliName : op.id);
      }
    }
  } else {
    return undefined;
  }
}

export function getSingleOptionString(q: SingleSelectQuestion | MultiSelectQuestion): string | string[] {
  const singleOption = getSingleOption(q);
  if (q.returnObject) {
    if (q.type === NodeType.singleSelect) {
      return singleOption.id;
    }
    else {
      return [singleOption[0].id];
    }
  }
  else {
    return singleOption;
  }
}

export function toYargsOptions(data: Question): Options {
  const choices = getChoicesFromQTNodeQuestion(data);
  if (choices && choices.length > 0 && data.default === undefined) {
    data.default = choices[0];
  }
  const defaultValue = data.default;
  if (defaultValue && defaultValue instanceof Array && defaultValue.length > 0) {
    data.default = defaultValue.map((item) => item.toLocaleLowerCase());
  }
  else if (defaultValue && typeof defaultValue === "string"){
    data.default = defaultValue.toLocaleLowerCase();
  }
  return {
    array: data.type === NodeType.multiSelect,
    description: data.description || data.title || "",
    default: data.default,
    choices: choices,
    hidden: !!(data as any).hide,
    global: false
  };
}

export function toConfigMap(anwsers: { [_: string]: any }): ConfigMap {
  const config = new ConfigMap();
  for (const name in anwsers) {
    config.set(name, anwsers[name]);
  }
  return config;
}

export function flattenNodes(node: QTreeNode): QTreeNode[] {
  const nodeCopy = Object.assign({}, node);
  const children = (nodeCopy.children || []).concat([]);
  nodeCopy.children = undefined;
  return [nodeCopy].concat(...children.map(nd => flattenNodes(nd)));
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

export async function getSubscriptionIdFromEnvFile(rootfolder: string): Promise<string | undefined> {
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

    const configJson = result.value;
    configJson["solution"].subscriptionId = subscriptionId;
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
    `${p}/.${ConfigFolderName}/env.${getActiveEnv()}.json`
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
