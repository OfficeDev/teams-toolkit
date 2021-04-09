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
  ConfigFolderName
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
      const option = "option" in data ? data.option : undefined;

      let choices: string[] | undefined;
      if (option && option instanceof Array && option.length > 0) {
        if (typeof option[0] === "string") {
          choices = option as string[];
        } else {
          choices = (option as OptionItem[]).map((op) => op.id);
        }
      } else {
        choices = undefined;
      }

      params[data.name] = {
        array: data.type === NodeType.multiSelect,
        description: data.description || data.title || "",
        default: data.default,
        choices: choices,
        hidden: !!(data as any).hide
      };
    });
    return params;
  }
}

export function flattenNodes(root: QTreeNode): QTreeNode[] {
  const children = (root.children || []).concat([]);
  root.children = undefined;
  return children.concat(...children.map((node) => flattenNodes(node)));
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
  const filePath = `${rootfolder}/${ConfigFolderName}/env.${getActiveEnv()}.json`;
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
