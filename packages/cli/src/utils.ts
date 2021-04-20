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
  ConfigMap
} from "fx-api";
import { ConfigNotFoundError, ReadFileError } from "./error";

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
      params[data.name] = toYargsOptions(data);
    });
    return params;
  }
}

export function getChoicesFromQTNodeQuestion(data: Question): string[] | undefined {
  const option = "option" in data ? data.option : undefined;
  if (option && option instanceof Array && option.length > 0) {
    if (typeof option[0] === "string") {
      return option as string[];
    } else {
      return (option as OptionItem[]).map((op) => op.id);
    }
  } else {
    return undefined;
  }
}

export function toYargsOptions(data: Question): Options {
  const choices = getChoicesFromQTNodeQuestion(data);
  if (choices && choices.length > 0 && data.default === undefined) {
    data.default = choices[0];
  }
  return {
    array: data.type === NodeType.multiSelect,
    description: data.description || data.title || "",
    default: data.default,
    choices: choices,
    hidden: !!(data as any).hide
  };
}

export function toConfigMap(anwsers: { [_:string]: any } ): ConfigMap {
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

export async function readConfigs(rootfolder: string): Promise<Result<any, FxError>> {
  // TODO: change the dirname to teamsFx for monorepo
  const filePath = `${rootfolder}/.${ConfigFolderName}/env.${getActiveEnv()}.json`;
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
