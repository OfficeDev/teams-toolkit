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

export class TeamsAIValidator extends Validator {
  constructor(spec: OpenAPIV3.Document, options: ParseOptions) {
    super();
    this.projectType = ProjectType.TeamsAi;
    this.options = options;
    this.spec = spec;
    this.checkCircularReference();
  }

  validateSpec(): SpecValidationResult {
    const result: SpecValidationResult = { errors: [], warnings: [] };

    // validate spec server
    let validationResult = this.validateSpecServer();
    result.errors.push(...validationResult.errors);

    // validate no supported API
    validationResult = this.validateSpecNoSupportAPI();
    result.errors.push(...validationResult.errors);

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

    // validate operationId
    if (!this.options.allowMissingId && !operationObject.operationId) {
      result.reason.push(ErrorType.MissingOperationId);
    }

    // validate server
    const validateServerResult = this.validateServer(method, path);
    result.reason.push(...validateServerResult.reason);

    if (result.reason.length > 0) {
      result.isValid = false;
    }

    return result;
  }
}
