// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import {
  ParseOptions,
  APIValidationResult,
  ErrorType,
  ProjectType,
  CheckParamResult,
  SpecValidationResult,
} from "../interfaces";
import { Validator } from "./validator";
import { Utils } from "../utils";

export class SMEValidator extends Validator {
  private static readonly SMERequiredParamsMaxNum = 5;

  constructor(spec: OpenAPIV3.Document, options: ParseOptions) {
    super();
    this.projectType = ProjectType.SME;
    this.options = options;
    this.spec = spec;
    this.checkCircularReference();
  }

  validateSpec(): SpecValidationResult {
    const result: SpecValidationResult = { errors: [], warnings: [] };

    // validate spec version
    let validationResult = this.validateSpecVersion();
    result.errors.push(...validationResult.errors);

    // validate spec server
    validationResult = this.validateSpecServer();
    result.errors.push(...validationResult.errors);

    // validate no supported API
    validationResult = this.validateSpecNoSupportAPI();
    result.errors.push(...validationResult.errors);

    // validate operationId missing
    if (this.options.allowMissingId) {
      validationResult = this.validateSpecOperationId();
      result.warnings.push(...validationResult.warnings);
    }

    return result;
  }

  validateAPI(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };
    method = method.toLocaleLowerCase();

    // validate method and path
    const methodAndPathResult = this.validateMethodAndPath(method, path);
    if (!methodAndPathResult.isValid) {
      return methodAndPathResult;
    }

    const circularReferenceResult = this.validateCircularReference(method, path);
    if (!circularReferenceResult.isValid) {
      return circularReferenceResult;
    }

    const operationObject = (this.spec.paths[path] as any)[method] as OpenAPIV3.OperationObject;

    // validate auth
    const authCheckResult = this.validateAuth(method, path);
    result.reason.push(...authCheckResult.reason);

    // validate operationId
    if (!this.options.allowMissingId && !operationObject.operationId) {
      result.reason.push(ErrorType.MissingOperationId);
    }

    // validate server
    const validateServerResult = this.validateServer(method, path);
    result.reason.push(...validateServerResult.reason);

    // validate response
    const validateResponseResult = this.validateResponse(method, path);
    result.reason.push(...validateResponseResult.reason);

    let postBodyResult: CheckParamResult = {
      requiredNum: 0,
      optionalNum: 0,
      isValid: true,
      reason: [],
    };

    // validate requestBody
    const requestBody = operationObject.requestBody as OpenAPIV3.RequestBodyObject;
    const requestJsonBody = requestBody?.content["application/json"];

    if (Utils.containMultipleMediaTypes(requestBody)) {
      result.reason.push(ErrorType.PostBodyContainMultipleMediaTypes);
    }

    if (requestJsonBody) {
      const requestBodySchema = requestJsonBody.schema as OpenAPIV3.SchemaObject;

      postBodyResult = this.checkPostBodySchema(requestBodySchema, requestBody.required);
      result.reason.push(...postBodyResult.reason);
    }

    // validate parameters
    const paramObject = operationObject.parameters as OpenAPIV3.ParameterObject[];
    const paramResult = this.checkParamSchema(paramObject);
    result.reason.push(...paramResult.reason);

    // validate total parameters count
    if (paramResult.isValid && postBodyResult.isValid) {
      const paramCountResult = this.validateParamCount(postBodyResult, paramResult);
      result.reason.push(...paramCountResult.reason);
    }

    if (result.reason.length > 0) {
      result.isValid = false;
    }

    return result;
  }

  private validateResponse(method: string, path: string): APIValidationResult {
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

  private checkPostBodySchema(
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

  private checkParamSchema(paramObject: OpenAPIV3.ParameterObject[]): CheckParamResult {
    const paramResult: CheckParamResult = {
      requiredNum: 0,
      optionalNum: 0,
      isValid: true,
      reason: [],
    };

    if (!paramObject) {
      return paramResult;
    }

    for (let i = 0; i < paramObject.length; i++) {
      const param = paramObject[i];
      const schema = param.schema as OpenAPIV3.SchemaObject;

      const isRequiredWithoutDefault = param.required && schema.default === undefined;

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

  private validateParamCount(
    postBodyResult: CheckParamResult,
    paramResult: CheckParamResult
  ): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };
    const totalRequiredParams = postBodyResult.requiredNum + paramResult.requiredNum;
    const totalParams = totalRequiredParams + postBodyResult.optionalNum + paramResult.optionalNum;

    if (totalRequiredParams > 1) {
      if (
        !this.options.allowMultipleParameters ||
        totalRequiredParams > SMEValidator.SMERequiredParamsMaxNum
      ) {
        result.reason.push(ErrorType.ExceededRequiredParamsLimit);
      }
    } else if (totalParams === 0) {
      result.reason.push(ErrorType.NoParameter);
    }

    return result;
  }
}
