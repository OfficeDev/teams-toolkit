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

  protected validateServer(method: string, path: string): APIValidationResult {
    const result: APIValidationResult = { isValid: true, reason: [] };
    const serverObj = Utils.getServerObject(this.spec, method, path);
    if (!serverObj) {
      // should contain server URL
      result.reason.push(ErrorType.NoServerInformation);
    } else {
      const allowHttp = this.projectType === ProjectType.Copilot;
      const serverValidateResult = Utils.checkServerUrl([serverObj], allowHttp);
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

      if (this.projectType === ProjectType.Copilot) {
        return { isValid: true, reason: [] };
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
}
