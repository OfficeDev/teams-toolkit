// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import axios from "axios";
import fs from "fs-extra";
import { ConstantString } from "./constants";
import { OpenAPIV3 } from "openapi-types";

export async function isYamlSpecFile(specPath: string): Promise<boolean> {
  const isRemoteFile = specPath.startsWith("http:") || specPath.startsWith("https:");
  const fileContent = isRemoteFile
    ? (await axios.get(specPath)).data
    : await fs.readFile(specPath, "utf-8");

  try {
    JSON.parse(fileContent);
    return false;
  } catch (error) {
    return true;
  }
}

export function isSupportedApi(method: string, path: string, spec: OpenAPIV3.Document): boolean {
  debugger;
  const pathObj = spec.paths[path];
  method = method.toLocaleLowerCase();
  if (pathObj) {
    if (method === ConstantString.GetMethod && !pathObj[method]?.security) {
      const operationObject = pathObj[method] as OpenAPIV3.OperationObject;
      if (operationObject.parameters?.length === 1) {
        const paramObject = operationObject.parameters;
        for (const index in paramObject) {
          const param = paramObject[index] as OpenAPIV3.ParameterObject;
          if (param.in === "query" || param.in === "path") {
            const schema = param.schema as OpenAPIV3.SchemaObject;
            if (
              schema.type === "boolean" ||
              schema.type === "integer" ||
              schema.type === "number" ||
              schema.type === "string"
            ) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}
