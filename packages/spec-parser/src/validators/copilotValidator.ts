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

export class CopilotValidator extends Validator {
  constructor(spec: OpenAPIV3.Document, options: ParseOptions) {
    super();
    this.projectType = ProjectType.Copilot;
    this.options = options;
    this.spec = spec;
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

    if (result.reason.length > 0) {
      result.isValid = false;
    }

    return result;
  }
}
