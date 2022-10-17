// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { TemplateType } from "../constant";
import { deploymentOutput, templateArgs } from "../interface";
import { DriverContext } from "../../interface/commonArgs";

export function hasBicepTemplate(args: templateArgs[]): boolean {
  for (const arg of args) {
    const templateType = path.extname(arg.path).toLowerCase();
    if (templateType === TemplateType.Bicep) {
      return true;
    }
  }
  return false;
}

// TODO: should update when context get path property
export function getPath(path: string, context: DriverContext): string {
  return path;
}

export function convertOutputs(outputs: deploymentOutput[]): Map<string, string> {
  const res = new Map<string, string>();
  for (const output of outputs) {
    convertOutput(output, res);
  }
  return res;
}

function convertOutput(output: deploymentOutput, map: Map<string, string>, prefix?: string) {
  const keys = Object.keys(output);
  for (const key of keys) {
    const value = output[key].value;
    if (value instanceof Object) {
      const newPrefix = buildKey(key, prefix);
      convertOutput(value, map, newPrefix);
    } else {
      const mapKey = buildKey(key, prefix);
      map.set(mapKey.toUpperCase(), value.toString());
    }
  }
}

function buildKey(key: string, prefix?: string): string {
  return prefix ? prefix + "__" + key : key;
}
