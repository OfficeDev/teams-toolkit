// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import axios from "axios";
import fs from "fs-extra";
import { ConstantString } from "./constants";
import { OpenAPIV3 } from "openapi-types";
import path from "path";

export async function isYamlSpecFile(specPath: string): Promise<boolean> {
  if (specPath.endsWith(".yaml") || specPath.endsWith(".yml")) {
    return true;
  } else if (specPath.endsWith(".json")) {
    return false;
  }
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

export function checkRequiredParameters(paramObject: OpenAPIV3.ParameterObject[]): boolean {
  let requiredParamCount = 0;
  for (let i = 0; i < paramObject.length; i++) {
    const param = paramObject[i];
    if (param.in === "header" || param.in === "cookie") {
      return false;
    }

    if (param.required && (param.in === "query" || param.in === "path")) {
      requiredParamCount++;
    }
  }

  if (requiredParamCount <= 1) {
    return true;
  }

  return false;
}

export function isSupportedApi(method: string, path: string, spec: OpenAPIV3.Document): boolean {
  const pathObj = spec.paths[path];
  method = method.toLocaleLowerCase();
  if (pathObj) {
    if (method === ConstantString.GetMethod && pathObj[method] && !pathObj[method]?.security) {
      const operationObject = pathObj[method] as OpenAPIV3.OperationObject;
      const paramObject = operationObject.parameters as OpenAPIV3.ParameterObject[];

      if (!paramObject || paramObject.length === 0) {
        return true;
      }

      const valid = checkRequiredParameters(paramObject);

      if (valid) {
        for (let i = 0; i < paramObject.length; i++) {
          const param = paramObject[i];

          const schema = param.schema as OpenAPIV3.SchemaObject;
          if (
            schema.type === "boolean" ||
            schema.type === "integer" ||
            schema.type === "number" ||
            schema.type === "string"
          ) {
            const responseJson = getResponseJson(operationObject);
            if (Object.keys(responseJson).length === 0) {
              return false;
            }

            return true;
          }
        }
      }
    }
  }

  return false;
}

export function updateFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getRelativePath(from: string, to: string): string {
  const relativePath = path.relative(path.dirname(from), to);
  return path.normalize(relativePath).replace(/\\/g, "/");
}

export function getResponseJson(
  operationObject: OpenAPIV3.OperationObject | undefined
): OpenAPIV3.MediaTypeObject {
  let json: OpenAPIV3.MediaTypeObject = {};

  for (const code of ConstantString.ResponseCodeFor20X) {
    const responseObject = operationObject?.responses?.[code] as OpenAPIV3.ResponseObject;
    if (responseObject?.content?.["application/json"]) {
      json = responseObject.content["application/json"];
      break;
    }
  }

  return json;
}

export function convertPathToCamelCase(path: string): string {
  const pathSegments = path.split("/");
  const camelCaseSegments = pathSegments.map((segment) => {
    if (segment.startsWith("{")) {
      segment = segment.substring(1, segment.length - 1);
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  });
  const camelCasePath = camelCaseSegments.join("");
  return camelCasePath;
}

export function getUrlProtocol(urlString: string): string | undefined {
  try {
    const url = new URL(urlString);
    return url.protocol;
  } catch (err) {
    return undefined;
  }
}
