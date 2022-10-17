// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import { TemplateType } from "../constant";
import { deploymentOutput, templateArgs } from "../interface";
import { DriverContext } from "../../interface/commonArgs";

export function hasBicepTemplate(args: templateArgs[]): boolean {
  for (const arg of args) {
    const templateType = getFileExtension(arg.path);
    if (templateType === TemplateType.Bicep) {
      return true;
    }
  }
  return false;
}

export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext ? ext.substring(1) : ext;
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

/**
 * convert arm deployment output to string-string map which will be set in env.
 * The key will be converted to upperCase
 * The nested key will use "__" to join the key name
 * { tabOutput:
 *    {
 *      type: "Object",
 *      value: {
 *        keyA: "valueA",
 *        KeyB: 1
 *      }
 *    }
 * }
 * Convert the above output, there will be 2 keys TABOUTPUT__KEYA, TABOUTPUT__KEYB
 */
function convertOutput(output: deploymentOutput, map: Map<string, string>, prefix?: string) {
  const keys = Object.keys(output);
  for (const key of keys) {
    const value = output[key].value;
    if (value instanceof Object) {
      const newPrefix = buildKey(key, prefix);
      convertOutput(value, map, newPrefix);
    } else {
      const mapKey = buildKey(key, prefix);
      if (map.get(mapKey)) {
        throw new Error(`There is duplicated key ${mapKey} in arm deployment output`);
      }
      map.set(mapKey.toUpperCase(), value.toString());
    }
  }
}

function buildKey(key: string, prefix?: string): string {
  return prefix ? prefix + "__" + key : key;
}
