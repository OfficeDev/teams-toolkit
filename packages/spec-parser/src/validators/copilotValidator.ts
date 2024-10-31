// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import {
  ParseOptions,
  APIValidationResult,
  ErrorType,
  ProjectType,
  SpecValidationResult,
} from "../interfaces";
import { Validator } from "./validator";
import { Utils } from "../utils";

export class CopilotValidator extends Validator {
  constructor(spec: OpenAPIV3.Document, options: ParseOptions) {
    super();
    this.projectType = ProjectType.Copilot;
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
    validationResult = this.validateSpecOperationId();
    result.warnings.push(...validationResult.warnings);

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

    // validate requestBody
    const requestBody = operationObject.requestBody as OpenAPIV3.RequestBodyObject;
    const requestJsonBody = requestBody?.content["application/json"];

    if (requestJsonBody) {
      const requestBodySchema = requestJsonBody.schema as OpenAPIV3.SchemaObject;

      if (!Utils.isObjectSchema(requestBodySchema)) {
        result.reason.push(ErrorType.PostBodySchemaIsNotJson);
      }

      const requestBodyParamResult = this.checkPostBodySchema(
        requestBodySchema,
        requestBody.required
      );
      result.reason.push(...requestBodyParamResult.reason);
    }

    // validate parameters
    const paramObject = operationObject.parameters as OpenAPIV3.ParameterObject[];
    const paramResult = this.checkParamSchema(paramObject);
    result.reason.push(...paramResult.reason);

    if (result.reason.length > 0) {
      result.isValid = false;
    }

    return result;
  }
}
