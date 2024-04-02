// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import {
  ParseOptions,
  APIValidationResult,
  ErrorType,
  CheckParamResult,
  ProjectType,
} from "../interfaces";
import { Utils } from "../utils";

export abstract class Validator {
  projectType!: ProjectType;
  spec!: OpenAPIV3.Document;
  options!: ParseOptions;

  abstract validateAPI(method: string, path: string): APIValidationResult;

  validateMethodAndPath(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };

    if (this.options.allowMethods && !this.options.allowMethods.includes(method)) {
      result.isValid = false;
      result.reason.push(ErrorType.MethodNotAllowed);
      return result;
    }

    const pathObj = this.spec.paths[path] as any;

    if (!pathObj || !pathObj[method]) {
      result.isValid = false;
      result.reason.push(ErrorType.UrlPathNotExist);
      return result;
    }

    return result;
  }

  validateResponse(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };

    const operationObject = (this.spec.paths[path] as any)[method] as OpenAPIV3.OperationObject;

    const { json, multipleMediaType } = Utils.getResponseJson(operationObject);

    // only support response body only contains “application/json” content type
    if (multipleMediaType) {
      result.reason.push(ErrorType.ResponseContainMultipleMediaTypes);
    } else if (Object.keys(json).length === 0) {
      // response body should not be empty
      result.reason.push(ErrorType.ResponseJsonIsEmpty);
    }

    return result;
  }

  validateServer(method: string, path: string): APIValidationResult {
    const pathObj = this.spec.paths[path] as any;

    const result: APIValidationResult = { isValid: true, reason: [] };
    const operationObject = pathObj[method] as OpenAPIV3.OperationObject;

    const rootServer = this.spec.servers && this.spec.servers[0];
    const methodServer = this.spec.paths[path]!.servers && this.spec.paths[path]!.servers![0];
    const operationServer = operationObject.servers && operationObject.servers[0];

    const serverUrl = operationServer || methodServer || rootServer;
    if (!serverUrl) {
      // should contain server URL
      result.reason.push(ErrorType.NoServerInformation);
    } else {
      // server url should be absolute url with https protocol
      const serverValidateResult = Utils.checkServerUrl([serverUrl]);
      result.reason.push(...serverValidateResult.map((item) => item.type));
    }

    return result;
  }

  validateAuth(method: string, path: string): APIValidationResult {
    const pathObj = this.spec.paths[path] as any;
    const operationObject = pathObj[method] as OpenAPIV3.OperationObject;

    const securities = operationObject.security;
    const authSchemeArray = Utils.getAuthArray(securities, this.spec);

    if (authSchemeArray.length === 0) {
      return { isValid: true, reason: [] };
    }

    if (
      this.options.allowAPIKeyAuth ||
      this.options.allowOauth2 ||
      this.options.allowBearerTokenAuth
    ) {
      // Currently we don't support multiple auth in one operation
      if (authSchemeArray.length > 0 && authSchemeArray.every((auths) => auths.length > 1)) {
        return {
          isValid: false,
          reason: [ErrorType.MultipleAuthNotSupported],
        };
      }

      for (const auths of authSchemeArray) {
        if (auths.length === 1) {
          if (
            (this.options.allowAPIKeyAuth && Utils.isAPIKeyAuth(auths[0].authScheme)) ||
            (this.options.allowOauth2 && Utils.isOAuthWithAuthCodeFlow(auths[0].authScheme)) ||
            (this.options.allowBearerTokenAuth && Utils.isBearerTokenAuth(auths[0].authScheme))
          ) {
            return { isValid: true, reason: [] };
          }
        }
      }
    }

    return { isValid: false, reason: [ErrorType.AuthTypeIsNotSupported] };
  }

  checkPostBodySchema(schema: OpenAPIV3.SchemaObject, isRequired = false): CheckParamResult {
    const paramResult: CheckParamResult = {
      requiredNum: 0,
      optionalNum: 0,
      isValid: true,
      reason: [],
    };

    if (Object.keys(schema).length === 0) {
      return paramResult;
    }

    const isRequiredWithoutDefault = isRequired && schema.default === undefined;
    const isCopilot = this.projectType === ProjectType.Copilot;

    if (isCopilot && this.hasNestedObjectInSchema(schema)) {
      paramResult.isValid = false;
      paramResult.reason = [ErrorType.RequestBodyContainsNestedObject];
      return paramResult;
    }

    if (
      schema.type === "string" ||
      schema.type === "integer" ||
      schema.type === "boolean" ||
      schema.type === "number"
    ) {
      if (isRequiredWithoutDefault) {
        paramResult.requiredNum = paramResult.requiredNum + 1;
      } else {
        paramResult.optionalNum = paramResult.optionalNum + 1;
      }
    } else if (schema.type === "object") {
      const { properties } = schema;
      for (const property in properties) {
        let isRequired = false;
        if (schema.required && schema.required?.indexOf(property) >= 0) {
          isRequired = true;
        }
        const result = this.checkPostBodySchema(
          properties[property] as OpenAPIV3.SchemaObject,
          isRequired
        );
        paramResult.requiredNum += result.requiredNum;
        paramResult.optionalNum += result.optionalNum;
        paramResult.isValid = paramResult.isValid && result.isValid;
        paramResult.reason.push(...result.reason);
      }
    } else {
      if (isRequiredWithoutDefault && !isCopilot) {
        paramResult.isValid = false;
        paramResult.reason.push(ErrorType.PostBodyContainsRequiredUnsupportedSchema);
      }
    }
    return paramResult;
  }

  checkParamSchema(paramObject: OpenAPIV3.ParameterObject[]): CheckParamResult {
    const paramResult: CheckParamResult = {
      requiredNum: 0,
      optionalNum: 0,
      isValid: true,
      reason: [],
    };

    if (!paramObject) {
      return paramResult;
    }

    const isCopilot = this.projectType === ProjectType.Copilot;

    for (let i = 0; i < paramObject.length; i++) {
      const param = paramObject[i];
      const schema = param.schema as OpenAPIV3.SchemaObject;

      if (isCopilot && this.hasNestedObjectInSchema(schema)) {
        paramResult.isValid = false;
        paramResult.reason.push(ErrorType.ParamsContainsNestedObject);
        continue;
      }

      const isRequiredWithoutDefault = param.required && schema.default === undefined;

      if (isCopilot) {
        if (isRequiredWithoutDefault) {
          paramResult.requiredNum = paramResult.requiredNum + 1;
        } else {
          paramResult.optionalNum = paramResult.optionalNum + 1;
        }
        continue;
      }

      if (param.in === "header" || param.in === "cookie") {
        if (isRequiredWithoutDefault) {
          paramResult.isValid = false;
          paramResult.reason.push(ErrorType.ParamsContainRequiredUnsupportedSchema);
        }
        continue;
      }

      if (
        schema.type !== "boolean" &&
        schema.type !== "string" &&
        schema.type !== "number" &&
        schema.type !== "integer"
      ) {
        if (isRequiredWithoutDefault) {
          paramResult.isValid = false;
          paramResult.reason.push(ErrorType.ParamsContainRequiredUnsupportedSchema);
        }
        continue;
      }

      if (param.in === "query" || param.in === "path") {
        if (isRequiredWithoutDefault) {
          paramResult.requiredNum = paramResult.requiredNum + 1;
        } else {
          paramResult.optionalNum = paramResult.optionalNum + 1;
        }
      }
    }

    return paramResult;
  }

  private hasNestedObjectInSchema(schema: OpenAPIV3.SchemaObject): boolean {
    if (schema.type === "object") {
      for (const property in schema.properties) {
        const nestedSchema = schema.properties[property] as OpenAPIV3.SchemaObject;
        if (nestedSchema.type === "object") {
          return true;
        }
      }
    }
    return false;
  }
}
