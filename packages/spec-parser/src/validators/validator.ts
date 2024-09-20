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
  APIMap,
  SpecValidationResult,
  WarningType,
  InvalidAPIInfo,
} from "../interfaces";
import { Utils } from "../utils";
import { ConstantString } from "../constants";

export abstract class Validator {
  projectType!: ProjectType;
  spec!: OpenAPIV3.Document;
  options!: ParseOptions;

  private apiMap: APIMap | undefined;
  private hasCircularReference = false;

  abstract validateAPI(method: string, path: string): APIValidationResult;
  abstract validateSpec(): SpecValidationResult;

  protected checkCircularReference(): void {
    try {
      JSON.stringify(this.spec);
    } catch (e) {
      if ((e as Error).message.includes("Converting circular structure to JSON")) {
        this.hasCircularReference = true;
      }
    }
  }

  listAPIs(): APIMap {
    if (this.apiMap) {
      return this.apiMap;
    }

    const paths = this.spec.paths;
    const result: APIMap = {};
    for (const path in paths) {
      const methods = paths[path];
      for (const method in methods) {
        const operationObject = (methods as any)[method] as OpenAPIV3.OperationObject;
        if (this.options.allowMethods?.includes(method) && operationObject) {
          const validateResult = this.validateAPI(method, path);
          result[`${method.toUpperCase()} ${path}`] = {
            operation: operationObject,
            isValid: validateResult.isValid,
            reason: validateResult.reason,
          };
        }
      }
    }

    this.apiMap = result;
    return result;
  }

  protected validateSpecVersion(): SpecValidationResult {
    const result: SpecValidationResult = { errors: [], warnings: [] };

    if (this.spec.openapi >= "3.1.0") {
      result.errors.push({
        type: ErrorType.SpecVersionNotSupported,
        content: Utils.format(ConstantString.SpecVersionNotSupported, this.spec.openapi),
        data: this.spec.openapi,
      });
    }

    return result;
  }

  protected validateSpecServer(): SpecValidationResult {
    const result: SpecValidationResult = { errors: [], warnings: [] };
    const serverErrors = Utils.validateServer(this.spec, this.options);
    result.errors.push(...serverErrors);
    return result;
  }

  protected validateSpecNoSupportAPI(): SpecValidationResult {
    const result: SpecValidationResult = { errors: [], warnings: [] };

    const apiMap = this.listAPIs();

    const validAPIs = Object.entries(apiMap).filter(([, value]) => value.isValid);
    if (validAPIs.length === 0) {
      const data = [];
      for (const key in apiMap) {
        const { reason } = apiMap[key];
        const apiInvalidReason: InvalidAPIInfo = { api: key, reason: reason };
        data.push(apiInvalidReason);
      }

      result.errors.push({
        type: ErrorType.NoSupportedApi,
        content: ConstantString.NoSupportedApi,
        data,
      });
    }

    return result;
  }

  protected validateSpecOperationId(): SpecValidationResult {
    const result: SpecValidationResult = { errors: [], warnings: [] };
    const apiMap = this.listAPIs();

    // OperationId missing
    const apisMissingOperationId: string[] = [];
    for (const key in apiMap) {
      const { operation } = apiMap[key];
      if (!operation.operationId) {
        apisMissingOperationId.push(key);
      }
    }

    if (apisMissingOperationId.length > 0) {
      result.warnings.push({
        type: WarningType.OperationIdMissing,
        content: Utils.format(ConstantString.MissingOperationId, apisMissingOperationId.join(", ")),
        data: apisMissingOperationId,
      });
    }

    return result;
  }

  protected validateMethodAndPath(method: string, path: string): APIValidationResult {
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

  protected validateCircularReference(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };
    if (this.hasCircularReference) {
      const operationObject = (this.spec.paths[path] as any)[method] as OpenAPIV3.OperationObject;
      try {
        JSON.stringify(operationObject);
      } catch (e) {
        if ((e as Error).message.includes("Converting circular structure to JSON")) {
          result.isValid = false;
          result.reason.push(ErrorType.CircularReferenceNotSupported);
        }
      }
    }

    return result;
  }

  protected validateResponse(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };

    const operationObject = (this.spec.paths[path] as any)[method] as OpenAPIV3.OperationObject;

    const { json, multipleMediaType } = Utils.getResponseJson(operationObject);

    if (this.options.projectType === ProjectType.SME) {
      // only support response body only contains “application/json” content type
      if (multipleMediaType) {
        result.reason.push(ErrorType.ResponseContainMultipleMediaTypes);
      } else if (Object.keys(json).length === 0) {
        // response body should not be empty
        result.reason.push(ErrorType.ResponseJsonIsEmpty);
      }
    }

    return result;
  }

  protected validateServer(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };
    const serverObj = Utils.getServerObject(this.spec, method, path);
    if (!serverObj) {
      // should contain server URL
      result.reason.push(ErrorType.NoServerInformation);
    } else {
      // server url should be absolute url with https protocol
      const serverValidateResult = Utils.checkServerUrl([serverObj]);
      result.reason.push(...serverValidateResult.map((item) => item.type));
    }

    return result;
  }

  protected validateAuth(method: string, path: string): APIValidationResult {
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

  protected checkPostBodySchema(
    schema: OpenAPIV3.SchemaObject,
    isRequired = false
  ): CheckParamResult {
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

    if (isCopilot && Utils.hasNestedObjectInSchema(schema)) {
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
    } else if (Utils.isObjectSchema(schema)) {
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

  protected checkParamSchema(paramObject: OpenAPIV3.ParameterObject[]): CheckParamResult {
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

      if (isCopilot && Utils.hasNestedObjectInSchema(schema)) {
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
}
