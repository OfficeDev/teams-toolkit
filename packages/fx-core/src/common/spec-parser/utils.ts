// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import axios from "axios";
import fs from "fs-extra";
import { ConstantString } from "./constants";
import { OpenAPIV3 } from "openapi-types";
import path from "path";
import * as util from "util";
import { CheckParamResult, ErrorResult, ErrorType } from "./interfaces";
import { format } from "util";

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

export function checkParameters(paramObject: OpenAPIV3.ParameterObject[]): CheckParamResult {
  const paramResult = {
    requiredNum: 0,
    optionalNum: 0,
    isValid: true,
  };

  if (!paramObject) {
    return paramResult;
  }

  for (let i = 0; i < paramObject.length; i++) {
    const param = paramObject[i];
    if (param.in === "header" || param.in === "cookie") {
      if (param.required) {
        paramResult.isValid = false;
      }
      continue;
    }

    const schema = param.schema as OpenAPIV3.SchemaObject;
    if (
      schema.type !== "boolean" &&
      schema.type !== "string" &&
      schema.type !== "number" &&
      schema.type !== "integer"
    ) {
      if (param.required) {
        paramResult.isValid = false;
      }
      continue;
    }

    if (param.in === "query" || param.in === "path") {
      if (param.required) {
        paramResult.requiredNum = paramResult.requiredNum + 1;
      } else {
        paramResult.optionalNum = paramResult.optionalNum + 1;
      }
    }
  }

  return paramResult;
}

export function checkPostBody(schema: OpenAPIV3.SchemaObject): CheckParamResult {
  const paramResult = {
    requiredNum: 0,
    optionalNum: 0,
    isValid: true,
  };

  if (Object.keys(schema).length === 0) {
    return paramResult;
  }

  if (
    schema.type === "string" ||
    schema.type === "integer" ||
    schema.type === "boolean" ||
    schema.type === "number"
  ) {
    if (schema.required) {
      paramResult.requiredNum = paramResult.requiredNum + 1;
    } else {
      paramResult.optionalNum = paramResult.optionalNum + 1;
    }
  } else if (schema.type === "object") {
    const { properties } = schema;
    for (const property in properties) {
      const result = checkPostBody(properties[property] as OpenAPIV3.SchemaObject);
      paramResult.requiredNum += result.requiredNum;
      paramResult.optionalNum += result.optionalNum;
      paramResult.isValid = paramResult.isValid && result.isValid;
    }
  } else {
    if (schema.required) {
      paramResult.isValid = false;
    }
  }
  return paramResult;
}

/**
 * Checks if the given API is supported.
 * @param {string} method - The HTTP method of the API.
 * @param {string} path - The path of the API.
 * @param {OpenAPIV3.Document} spec - The OpenAPI specification document.
 * @returns {boolean} - Returns true if the API is supported, false otherwise.
 * @description The following APIs are supported:
 * 1. only support Get/Post operation without auth property
 * 2. parameter inside query or path only support string, number, boolean and integer
 * 3. parameter inside post body only support string, number, boolean, integer and object
 * 4. request body + required parameters <= 1
 * 5. response body should be “application/json” and not empty, and response code should be 20X
 * 6. only support request body with “application/json” content type
 */
export function isSupportedApi(method: string, path: string, spec: OpenAPIV3.Document): boolean {
  const pathObj = spec.paths[path];
  method = method.toLocaleLowerCase();
  if (pathObj) {
    if (
      (method === ConstantString.PostMethod || method === ConstantString.GetMethod) &&
      pathObj[method] &&
      !pathObj[method]?.security
    ) {
      const operationObject = pathObj[method] as OpenAPIV3.OperationObject;
      const paramObject = operationObject.parameters as OpenAPIV3.ParameterObject[];

      const requestBody = operationObject.requestBody as OpenAPIV3.RequestBodyObject;
      const requestJsonBody = requestBody?.content["application/json"];

      const responseJson = getResponseJson(operationObject);
      if (Object.keys(responseJson).length === 0) {
        return false;
      }

      let requestBodyParamResult = {
        requiredNum: 0,
        optionalNum: 0,
        isValid: true,
      };

      if (requestJsonBody) {
        const requestBodySchema = requestJsonBody.schema as OpenAPIV3.SchemaObject;
        requestBodyParamResult = checkPostBody(requestBodySchema);
      }

      if (!requestBodyParamResult.isValid) {
        return false;
      }

      const paramResult = checkParameters(paramObject);

      if (!paramResult.isValid) {
        return false;
      }

      if (requestBodyParamResult.requiredNum + paramResult.requiredNum > 1) {
        return false;
      } else if (
        requestBodyParamResult.requiredNum +
          requestBodyParamResult.optionalNum +
          paramResult.requiredNum +
          paramResult.optionalNum ===
        0
      ) {
        return false;
      } else {
        return true;
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

export function resolveServerUrl(url: string): string {
  const placeHolderReg = /\${{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
  let matches = placeHolderReg.exec(url);
  let newUrl = url;
  while (matches != null) {
    const envVar = matches[1];
    const envVal = process.env[envVar];
    if (!envVal) {
      throw new Error(format(ConstantString.ResolveServerUrlFailed, envVar));
    } else {
      newUrl = newUrl.replace(matches[0], envVal);
    }
    matches = placeHolderReg.exec(url);
  }
  return newUrl;
}

export function checkServerUrl(servers: OpenAPIV3.ServerObject[]): ErrorResult[] {
  const errors: ErrorResult[] = [];

  let serverUrl;
  try {
    serverUrl = resolveServerUrl(servers[0].url);
  } catch (err) {
    errors.push({
      type: ErrorType.ResolveServerUrlFailed,
      content: (err as Error).message,
      data: servers,
    });
    return errors;
  }

  const protocol = getUrlProtocol(serverUrl);
  if (!protocol) {
    // Relative server url is not supported
    errors.push({
      type: ErrorType.RelativeServerUrlNotSupported,
      content: ConstantString.RelativeServerUrlNotSupported,
      data: servers,
    });
  } else if (protocol !== "https:") {
    // Http server url is not supported
    errors.push({
      type: ErrorType.UrlProtocolNotSupported,
      content: util.format(ConstantString.UrlProtocolNotSupported, protocol),
      data: servers,
    });
  }

  return errors;
}

export function validateServer(spec: OpenAPIV3.Document): ErrorResult[] {
  const errors: ErrorResult[] = [];

  let hasTopLevelServers = false;
  let hasPathLevelServers = false;
  let hasOperationLevelServers = false;

  if (spec.servers && spec.servers.length >= 1) {
    hasTopLevelServers = true;

    // for multiple server, we only use the first url
    const serverErrors = checkServerUrl(spec.servers);
    errors.push(...serverErrors);
  }

  const paths = spec.paths;
  for (const path in paths) {
    const methods = paths[path];

    if (methods?.servers && methods.servers.length >= 1) {
      hasPathLevelServers = true;
      const serverErrors = checkServerUrl(methods.servers);
      errors.push(...serverErrors);
    }

    for (const method in methods) {
      const operationObject = (methods as any)[method] as OpenAPIV3.OperationObject;
      if (isSupportedApi(method, path, spec)) {
        if (operationObject?.servers && operationObject.servers.length >= 1) {
          hasOperationLevelServers = true;
          const serverErrors = checkServerUrl(operationObject.servers);
          errors.push(...serverErrors);
        }
      }
    }
  }
  if (!hasTopLevelServers && !hasPathLevelServers && !hasOperationLevelServers) {
    errors.push({
      type: ErrorType.NoServerInformation,
      content: ConstantString.NoServerInformation,
    });
  }
  return errors;
}
