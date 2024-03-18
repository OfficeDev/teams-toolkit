// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import SwaggerParser from "@apidevtools/swagger-parser";
import { ConstantString } from "./constants";
import {
  AuthInfo,
  CheckParamResult,
  ErrorResult,
  ErrorType,
  Parameter,
  ParseOptions,
  ProjectType,
  ValidateResult,
  ValidationStatus,
  WarningResult,
  WarningType,
} from "./interfaces";
import { IMessagingExtensionCommand } from "@microsoft/teams-manifest";

export class Utils {
  static hasNestedObjectInSchema(schema: OpenAPIV3.SchemaObject): boolean {
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

  static checkParameters(
    paramObject: OpenAPIV3.ParameterObject[],
    isCopilot: boolean
  ): CheckParamResult {
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
      const schema = param.schema as OpenAPIV3.SchemaObject;

      if (isCopilot && this.hasNestedObjectInSchema(schema)) {
        paramResult.isValid = false;
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

  static checkPostBody(
    schema: OpenAPIV3.SchemaObject,
    isRequired = false,
    isCopilot = false
  ): CheckParamResult {
    const paramResult = {
      requiredNum: 0,
      optionalNum: 0,
      isValid: true,
    };

    if (Object.keys(schema).length === 0) {
      return paramResult;
    }

    const isRequiredWithoutDefault = isRequired && schema.default === undefined;

    if (isCopilot && this.hasNestedObjectInSchema(schema)) {
      paramResult.isValid = false;
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
        const result = Utils.checkPostBody(
          properties[property] as OpenAPIV3.SchemaObject,
          isRequired,
          isCopilot
        );
        paramResult.requiredNum += result.requiredNum;
        paramResult.optionalNum += result.optionalNum;
        paramResult.isValid = paramResult.isValid && result.isValid;
      }
    } else {
      if (isRequiredWithoutDefault && !isCopilot) {
        paramResult.isValid = false;
      }
    }
    return paramResult;
  }

  static containMultipleMediaTypes(
    bodyObject: OpenAPIV3.RequestBodyObject | OpenAPIV3.ResponseObject
  ): boolean {
    return Object.keys(bodyObject?.content || {}).length > 1;
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
  static isSupportedApi(
    method: string,
    path: string,
    spec: OpenAPIV3.Document,
    options: ParseOptions
  ): boolean {
    const pathObj = spec.paths[path] as any;
    method = method.toLocaleLowerCase();
    if (pathObj) {
      if (options.allowMethods?.includes(method) && pathObj[method]) {
        const securities = pathObj[method].security;

        const isTeamsAi = options.projectType === ProjectType.TeamsAi;
        const isCopilot = options.projectType === ProjectType.Copilot;

        // Teams AI project doesn't care about auth, it will use authProvider for user to implement
        if (!isTeamsAi) {
          const authArray = Utils.getAuthArray(securities, spec);

          if (!Utils.isSupportedAuth(authArray, options)) {
            return false;
          }
        }

        const operationObject = pathObj[method] as OpenAPIV3.OperationObject;
        if (!options.allowMissingId && !operationObject.operationId) {
          return false;
        }
        const paramObject = operationObject.parameters as OpenAPIV3.ParameterObject[];

        const requestBody = operationObject.requestBody as OpenAPIV3.RequestBodyObject;
        const requestJsonBody = requestBody?.content["application/json"];

        if (!isTeamsAi && Utils.containMultipleMediaTypes(requestBody)) {
          return false;
        }

        const responseJson = Utils.getResponseJson(operationObject, isTeamsAi);

        if (Object.keys(responseJson).length === 0) {
          return false;
        }

        // Teams AI project doesn't care about request parameters/body
        if (isTeamsAi) {
          return true;
        }

        let requestBodyParamResult = {
          requiredNum: 0,
          optionalNum: 0,
          isValid: true,
        };

        if (requestJsonBody) {
          const requestBodySchema = requestJsonBody.schema as OpenAPIV3.SchemaObject;

          if (isCopilot && requestBodySchema.type !== "object") {
            return false;
          }

          requestBodyParamResult = Utils.checkPostBody(
            requestBodySchema,
            requestBody.required,
            isCopilot
          );
        }

        if (!requestBodyParamResult.isValid) {
          return false;
        }

        const paramResult = Utils.checkParameters(paramObject, isCopilot);

        if (!paramResult.isValid) {
          return false;
        }

        // Copilot support arbitrary parameters
        if (isCopilot) {
          return true;
        }

        if (requestBodyParamResult.requiredNum + paramResult.requiredNum > 1) {
          if (
            options.allowMultipleParameters &&
            requestBodyParamResult.requiredNum + paramResult.requiredNum <=
              ConstantString.SMERequiredParamsMaxNum
          ) {
            return true;
          }
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

  static isSupportedAuth(authSchemeArray: AuthInfo[][], options: ParseOptions): boolean {
    if (authSchemeArray.length === 0) {
      return true;
    }

    if (options.allowAPIKeyAuth || options.allowOauth2 || options.allowBearerTokenAuth) {
      // Currently we don't support multiple auth in one operation
      if (authSchemeArray.length > 0 && authSchemeArray.every((auths) => auths.length > 1)) {
        return false;
      }

      for (const auths of authSchemeArray) {
        if (auths.length === 1) {
          if (
            (options.allowAPIKeyAuth && Utils.isAPIKeyAuth(auths[0].authScheme)) ||
            (options.allowOauth2 && Utils.isOAuthWithAuthCodeFlow(auths[0].authScheme)) ||
            (options.allowBearerTokenAuth && Utils.isBearerTokenAuth(auths[0].authScheme))
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  static isBearerTokenAuth(authScheme: OpenAPIV3.SecuritySchemeObject): boolean {
    return authScheme.type === "http" && authScheme.scheme === "bearer";
  }

  static isAPIKeyAuth(authScheme: OpenAPIV3.SecuritySchemeObject): boolean {
    return authScheme.type === "apiKey";
  }

  static isOAuthWithAuthCodeFlow(authScheme: OpenAPIV3.SecuritySchemeObject): boolean {
    if (authScheme.type === "oauth2" && authScheme.flows && authScheme.flows.authorizationCode) {
      return true;
    }

    return false;
  }

  static getAuthArray(
    securities: OpenAPIV3.SecurityRequirementObject[] | undefined,
    spec: OpenAPIV3.Document
  ): AuthInfo[][] {
    const result: AuthInfo[][] = [];
    const securitySchemas = spec.components?.securitySchemes;
    if (securities && securitySchemas) {
      for (let i = 0; i < securities.length; i++) {
        const security = securities[i];

        const authArray: AuthInfo[] = [];
        for (const name in security) {
          const auth = securitySchemas[name] as OpenAPIV3.SecuritySchemeObject;
          authArray.push({
            authScheme: auth,
            name: name,
          });
        }

        if (authArray.length > 0) {
          result.push(authArray);
        }
      }
    }

    result.sort((a, b) => a[0].name.localeCompare(b[0].name));

    return result;
  }

  static updateFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static getResponseJson(
    operationObject: OpenAPIV3.OperationObject | undefined,
    isTeamsAiProject = false
  ): OpenAPIV3.MediaTypeObject {
    let json: OpenAPIV3.MediaTypeObject = {};

    for (const code of ConstantString.ResponseCodeFor20X) {
      const responseObject = operationObject?.responses?.[code] as OpenAPIV3.ResponseObject;

      if (responseObject?.content?.["application/json"]) {
        json = responseObject.content["application/json"];
        if (!isTeamsAiProject && Utils.containMultipleMediaTypes(responseObject)) {
          json = {};
        } else {
          break;
        }
      }
    }

    return json;
  }

  static convertPathToCamelCase(path: string): string {
    const pathSegments = path.split(/[./{]/);
    const camelCaseSegments = pathSegments.map((segment) => {
      segment = segment.replace(/}/g, "");
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    });
    const camelCasePath = camelCaseSegments.join("");
    return camelCasePath;
  }

  static getUrlProtocol(urlString: string): string | undefined {
    try {
      const url = new URL(urlString);
      return url.protocol;
    } catch (err) {
      return undefined;
    }
  }

  static resolveServerUrl(url: string): string {
    const placeHolderReg = /\${{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    let matches = placeHolderReg.exec(url);
    let newUrl = url;
    while (matches != null) {
      const envVar = matches[1];
      const envVal = process.env[envVar];
      if (!envVal) {
        throw new Error(Utils.format(ConstantString.ResolveServerUrlFailed, envVar));
      } else {
        newUrl = newUrl.replace(matches[0], envVal);
      }
      matches = placeHolderReg.exec(url);
    }
    return newUrl;
  }

  static checkServerUrl(servers: OpenAPIV3.ServerObject[]): ErrorResult[] {
    const errors: ErrorResult[] = [];

    let serverUrl;
    try {
      serverUrl = Utils.resolveServerUrl(servers[0].url);
    } catch (err) {
      errors.push({
        type: ErrorType.ResolveServerUrlFailed,
        content: (err as Error).message,
        data: servers,
      });
      return errors;
    }

    const protocol = Utils.getUrlProtocol(serverUrl);
    if (!protocol) {
      // Relative server url is not supported
      errors.push({
        type: ErrorType.RelativeServerUrlNotSupported,
        content: ConstantString.RelativeServerUrlNotSupported,
        data: servers,
      });
    } else if (protocol !== "https:") {
      // Http server url is not supported
      const protocolString = protocol.slice(0, -1);
      errors.push({
        type: ErrorType.UrlProtocolNotSupported,
        content: Utils.format(ConstantString.UrlProtocolNotSupported, protocol.slice(0, -1)),
        data: protocolString,
      });
    }

    return errors;
  }

  static validateServer(spec: OpenAPIV3.Document, options: ParseOptions): ErrorResult[] {
    const errors: ErrorResult[] = [];

    let hasTopLevelServers = false;
    let hasPathLevelServers = false;
    let hasOperationLevelServers = false;

    if (spec.servers && spec.servers.length >= 1) {
      hasTopLevelServers = true;

      // for multiple server, we only use the first url
      const serverErrors = Utils.checkServerUrl(spec.servers);
      errors.push(...serverErrors);
    }

    const paths = spec.paths;
    for (const path in paths) {
      const methods = paths[path];

      if (methods?.servers && methods.servers.length >= 1) {
        hasPathLevelServers = true;
        const serverErrors = Utils.checkServerUrl(methods.servers);
        errors.push(...serverErrors);
      }

      for (const method in methods) {
        const operationObject = (methods as any)[method] as OpenAPIV3.OperationObject;
        if (Utils.isSupportedApi(method, path, spec, options)) {
          if (operationObject?.servers && operationObject.servers.length >= 1) {
            hasOperationLevelServers = true;
            const serverErrors = Utils.checkServerUrl(operationObject.servers);
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

  static isWellKnownName(name: string, wellknownNameList: string[]): boolean {
    for (let i = 0; i < wellknownNameList.length; i++) {
      name = name.replace(/_/g, "").replace(/-/g, "");
      if (name.toLowerCase().includes(wellknownNameList[i])) {
        return true;
      }
    }
    return false;
  }

  static generateParametersFromSchema(
    schema: OpenAPIV3.SchemaObject,
    name: string,
    allowMultipleParameters: boolean,
    isRequired = false
  ): [Parameter[], Parameter[]] {
    const requiredParams: Parameter[] = [];
    const optionalParams: Parameter[] = [];

    if (
      schema.type === "string" ||
      schema.type === "integer" ||
      schema.type === "boolean" ||
      schema.type === "number"
    ) {
      const parameter = {
        name: name,
        title: Utils.updateFirstLetter(name).slice(0, ConstantString.ParameterTitleMaxLens),
        description: (schema.description ?? "").slice(
          0,
          ConstantString.ParameterDescriptionMaxLens
        ),
      };

      if (allowMultipleParameters) {
        Utils.updateParameterWithInputType(schema, parameter);
      }

      if (isRequired && schema.default === undefined) {
        requiredParams.push(parameter);
      } else {
        optionalParams.push(parameter);
      }
    } else if (schema.type === "object") {
      const { properties } = schema;
      for (const property in properties) {
        let isRequired = false;
        if (schema.required && schema.required?.indexOf(property) >= 0) {
          isRequired = true;
        }
        const [requiredP, optionalP] = Utils.generateParametersFromSchema(
          properties[property] as OpenAPIV3.SchemaObject,
          property,
          allowMultipleParameters,
          isRequired
        );

        requiredParams.push(...requiredP);
        optionalParams.push(...optionalP);
      }
    }

    return [requiredParams, optionalParams];
  }

  static updateParameterWithInputType(schema: OpenAPIV3.SchemaObject, param: Parameter): void {
    if (schema.enum) {
      param.inputType = "choiceset";
      param.choices = [];
      for (let i = 0; i < schema.enum.length; i++) {
        param.choices.push({
          title: schema.enum[i],
          value: schema.enum[i],
        });
      }
    } else if (schema.type === "string") {
      param.inputType = "text";
    } else if (schema.type === "integer" || schema.type === "number") {
      param.inputType = "number";
    } else if (schema.type === "boolean") {
      param.inputType = "toggle";
    }

    if (schema.default) {
      param.value = schema.default;
    }
  }

  static parseApiInfo(
    operationItem: OpenAPIV3.OperationObject,
    options: ParseOptions
  ): [IMessagingExtensionCommand, WarningResult | undefined] {
    const requiredParams: Parameter[] = [];
    const optionalParams: Parameter[] = [];
    const paramObject = operationItem.parameters as OpenAPIV3.ParameterObject[];

    if (paramObject) {
      paramObject.forEach((param: OpenAPIV3.ParameterObject) => {
        const parameter: Parameter = {
          name: param.name,
          title: Utils.updateFirstLetter(param.name).slice(0, ConstantString.ParameterTitleMaxLens),
          description: (param.description ?? "").slice(
            0,
            ConstantString.ParameterDescriptionMaxLens
          ),
        };

        const schema = param.schema as OpenAPIV3.SchemaObject;
        if (options.allowMultipleParameters && schema) {
          Utils.updateParameterWithInputType(schema, parameter);
        }

        if (param.in !== "header" && param.in !== "cookie") {
          if (param.required && schema?.default === undefined) {
            requiredParams.push(parameter);
          } else {
            optionalParams.push(parameter);
          }
        }
      });
    }

    if (operationItem.requestBody) {
      const requestBody = operationItem.requestBody as OpenAPIV3.RequestBodyObject;
      const requestJson = requestBody.content["application/json"];
      if (Object.keys(requestJson).length !== 0) {
        const schema = requestJson.schema as OpenAPIV3.SchemaObject;
        const [requiredP, optionalP] = Utils.generateParametersFromSchema(
          schema,
          "requestBody",
          !!options.allowMultipleParameters,
          requestBody.required
        );
        requiredParams.push(...requiredP);
        optionalParams.push(...optionalP);
      }
    }

    const operationId = operationItem.operationId!;

    const parameters = [];

    if (requiredParams.length !== 0) {
      parameters.push(...requiredParams);
    } else {
      parameters.push(optionalParams[0]);
    }

    const command: IMessagingExtensionCommand = {
      context: ["compose"],
      type: "query",
      title: (operationItem.summary ?? "").slice(0, ConstantString.CommandTitleMaxLens),
      id: operationId,
      parameters: parameters,
      description: (operationItem.description ?? "").slice(
        0,
        ConstantString.CommandDescriptionMaxLens
      ),
    };
    let warning: WarningResult | undefined = undefined;

    if (requiredParams.length === 0 && optionalParams.length > 1) {
      warning = {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: Utils.format(ConstantString.OperationOnlyContainsOptionalParam, operationId),
        data: operationId,
      };
    }
    return [command, warning];
  }

  static listSupportedAPIs(
    spec: OpenAPIV3.Document,
    options: ParseOptions
  ): {
    [key: string]: OpenAPIV3.OperationObject;
  } {
    const paths = spec.paths;
    const result: { [key: string]: OpenAPIV3.OperationObject } = {};
    for (const path in paths) {
      const methods = paths[path];
      for (const method in methods) {
        if (Utils.isSupportedApi(method, path, spec, options)) {
          const operationObject = (methods as any)[method] as OpenAPIV3.OperationObject;
          result[`${method.toUpperCase()} ${path}`] = operationObject;
        }
      }
    }
    return result;
  }

  static validateSpec(
    spec: OpenAPIV3.Document,
    parser: SwaggerParser,
    isSwaggerFile: boolean,
    options: ParseOptions
  ): ValidateResult {
    const errors: ErrorResult[] = [];
    const warnings: WarningResult[] = [];

    if (isSwaggerFile) {
      warnings.push({
        type: WarningType.ConvertSwaggerToOpenAPI,
        content: ConstantString.ConvertSwaggerToOpenAPI,
      });
    }

    // Server validation
    const serverErrors = Utils.validateServer(spec, options);
    errors.push(...serverErrors);

    // Remote reference not supported
    const refPaths = parser.$refs.paths();

    // refPaths [0] is the current spec file path
    if (refPaths.length > 1) {
      errors.push({
        type: ErrorType.RemoteRefNotSupported,
        content: Utils.format(ConstantString.RemoteRefNotSupported, refPaths.join(", ")),
        data: refPaths,
      });
    }

    // No supported API
    const apiMap = Utils.listSupportedAPIs(spec, options);
    if (Object.keys(apiMap).length === 0) {
      errors.push({
        type: ErrorType.NoSupportedApi,
        content: ConstantString.NoSupportedApi,
      });
    }

    // OperationId missing
    const apisMissingOperationId: string[] = [];
    for (const key in apiMap) {
      const pathObjectItem = apiMap[key];
      if (!pathObjectItem.operationId) {
        apisMissingOperationId.push(key);
      }
    }

    if (apisMissingOperationId.length > 0) {
      warnings.push({
        type: WarningType.OperationIdMissing,
        content: Utils.format(ConstantString.MissingOperationId, apisMissingOperationId.join(", ")),
        data: apisMissingOperationId,
      });
    }

    let status = ValidationStatus.Valid;
    if (warnings.length > 0 && errors.length === 0) {
      status = ValidationStatus.Warning;
    } else if (errors.length > 0) {
      status = ValidationStatus.Error;
    }

    return {
      status,
      warnings,
      errors,
    };
  }

  static format(str: string, ...args: string[]): string {
    let index = 0;
    return str.replace(/%s/g, () => {
      const arg = args[index++];
      return arg !== undefined ? arg : "";
    });
  }

  static getSafeRegistrationIdEnvName(authName: string): string {
    if (!authName) {
      return "";
    }

    let safeRegistrationIdEnvName = authName.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

    if (!safeRegistrationIdEnvName.match(/^[A-Z]/)) {
      safeRegistrationIdEnvName = "PREFIX_" + safeRegistrationIdEnvName;
    }

    return safeRegistrationIdEnvName;
  }
}
