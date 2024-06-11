// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import {
  APIInfo,
  ErrorType,
  GenerateResult,
  ParseOptions,
  ValidateResult,
  ValidationStatus,
  ListAPIResult,
  ProjectType,
  APIMap,
  ErrorResult,
  WarningResult,
} from "./interfaces";
import { SpecParserError } from "./specParserError";
import { Utils } from "./utils";
import { ConstantString } from "./constants";
import { ValidatorFactory } from "./validators/validatorFactory";
import { Validator } from "./validators/validator";

/**
 * A class that parses an OpenAPI specification file and provides methods to validate, list, and generate artifacts.
 */
export class SpecParser {
  public readonly pathOrSpec: string | OpenAPIV3.Document;
  public readonly parser: SwaggerParser;
  public readonly options: Required<ParseOptions>;

  private spec: OpenAPIV3.Document | undefined;
  private validator: Validator | undefined;
  private unResolveSpec: OpenAPIV3.Document | undefined;
  private isSwaggerFile: boolean | undefined;

  private defaultOptions: ParseOptions = {
    allowMissingId: false,
    allowSwagger: false,
    allowAPIKeyAuth: false,
    allowMultipleParameters: false,
    allowBearerTokenAuth: false,
    allowOauth2: false,
    allowMethods: ["get", "post"],
    allowConversationStarters: false,
    allowResponseSemantics: false,
    allowConfirmation: false,
    projectType: ProjectType.SME,
    isGptPlugin: false,
  };

  /**
   * Creates a new instance of the SpecParser class.
   * @param pathOrDoc The path to the OpenAPI specification file or the OpenAPI specification object.
   * @param options The options for parsing the OpenAPI specification file.
   */
  constructor(pathOrDoc: string | OpenAPIV3.Document, options?: ParseOptions) {
    this.pathOrSpec = pathOrDoc;
    this.parser = new SwaggerParser();
    this.options = {
      ...this.defaultOptions,
      ...(options ?? {}),
    } as Required<ParseOptions>;
  }

  /**
   * Validates the OpenAPI specification file and returns a validation result.
   *
   * @returns A validation result object that contains information about any errors or warnings in the specification file.
   */
  async validate(): Promise<ValidateResult> {
    try {
      try {
        await this.loadSpec();
        await this.parser.validate(this.spec!, {
          validate: {
            schema: false,
          },
        });
      } catch (e) {
        return {
          status: ValidationStatus.Error,
          warnings: [],
          errors: [{ type: ErrorType.SpecNotValid, content: (e as Error).toString() }],
        };
      }

      const errors: ErrorResult[] = [];
      const warnings: WarningResult[] = [];

      if (!this.options.allowSwagger && this.isSwaggerFile) {
        return {
          status: ValidationStatus.Error,
          warnings: [],
          errors: [
            {
              type: ErrorType.SwaggerNotSupported,
              content: ConstantString.SwaggerNotSupported,
            },
          ],
        };
      }

      // Remote reference not supported
      const refPaths = this.parser.$refs.paths();
      // refPaths [0] is the current spec file path
      if (refPaths.length > 1) {
        errors.push({
          type: ErrorType.RemoteRefNotSupported,
          content: Utils.format(ConstantString.RemoteRefNotSupported, refPaths.join(", ")),
          data: refPaths,
        });
      }

      const validator = this.getValidator(this.spec!);
      const validationResult = validator.validateSpec();

      warnings.push(...validationResult.warnings);
      errors.push(...validationResult.errors);

      let status = ValidationStatus.Valid;
      if (warnings.length > 0 && errors.length === 0) {
        status = ValidationStatus.Warning;
      } else if (errors.length > 0) {
        status = ValidationStatus.Error;
      }

      return {
        status: status,
        warnings: warnings,
        errors: errors,
      };
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.ValidateFailed);
    }
  }

  async listSupportedAPIInfo(): Promise<APIInfo[]> {
    try {
      await this.loadSpec();
      const apiMap = this.getAPIs(this.spec!);
      const apiInfos: APIInfo[] = [];
      for (const key in apiMap) {
        const { operation, isValid } = apiMap[key];

        if (!isValid) {
          continue;
        }

        const [method, path] = key.split(" ");
        const operationId = operation.operationId;

        // In Browser environment, this api is by default not support api without operationId
        if (!operationId) {
          continue;
        }

        const command = Utils.parseApiInfo(operation, this.options);

        const apiInfo: APIInfo = {
          method: method,
          path: path,
          title: command.title,
          id: operationId,
          parameters: command.parameters!,
          description: command.description!,
        };

        apiInfos.push(apiInfo);
      }

      return apiInfos;
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.listSupportedAPIInfoFailed);
    }
  }

  /**
   * Lists all the OpenAPI operations in the specification file.
   * @returns A string array that represents the HTTP method and path of each operation, such as ['GET /pets/{petId}', 'GET /user/{userId}']
   * according to copilot plugin spec, only list get and post method without auth
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async list(): Promise<ListAPIResult[]> {
    throw new Error("Method not implemented.");
  }

  /**
   * Generate specs according to the filters.
   * @param filter An array of strings that represent the filters to apply when generating the artifacts. If filter is empty, it would process nothing.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getFilteredSpecs(
    filter: string[],
    signal?: AbortSignal
  ): Promise<[OpenAPIV3.Document, OpenAPIV3.Document]> {
    throw new Error("Method not implemented.");
  }

  /**
   * Generates and update artifacts from the OpenAPI specification file. Generate Adaptive Cards, update Teams app manifest, and generate a new OpenAPI specification file.
   * @param manifestPath A file path of the Teams app manifest file to update.
   * @param filter An array of strings that represent the filters to apply when generating the artifacts. If filter is empty, it would process nothing.
   * @param outputSpecPath File path of the new OpenAPI specification file to generate. If not specified or empty, no spec file will be generated.
   * @param pluginFilePath File path of the api plugin file to generate.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async generateForCopilot(
    manifestPath: string,
    filter: string[],
    outputSpecPath: string,
    pluginFilePath: string,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    throw new Error("Method not implemented.");
  }
  /**
   * Generates and update artifacts from the OpenAPI specification file. Generate Adaptive Cards, update Teams app manifest, and generate a new OpenAPI specification file.
   * @param manifestPath A file path of the Teams app manifest file to update.
   * @param filter An array of strings that represent the filters to apply when generating the artifacts. If filter is empty, it would process nothing.
   * @param outputSpecPath File path of the new OpenAPI specification file to generate. If not specified or empty, no spec file will be generated.
   * @param adaptiveCardFolder Folder path where the Adaptive Card files will be generated. If not specified or empty, Adaptive Card files will not be generated.
   * @param isMe Boolean that indicates whether the project is an Messaging Extension. For Messaging Extension, composeExtensions will be added in Teams app manifest.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(
    manifestPath: string,
    filter: string[],
    outputSpecPath: string,
    adaptiveCardFolder?: string,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    throw new Error("Method not implemented.");
  }

  private async loadSpec(): Promise<void> {
    if (!this.spec) {
      this.unResolveSpec = (await this.parser.parse(this.pathOrSpec)) as OpenAPIV3.Document;
      if (!this.unResolveSpec.openapi && (this.unResolveSpec as any).swagger === "2.0") {
        this.isSwaggerFile = true;
      }

      const clonedUnResolveSpec = JSON.parse(JSON.stringify(this.unResolveSpec));
      this.spec = (await this.parser.dereference(clonedUnResolveSpec)) as OpenAPIV3.Document;
    }
  }

  private getAPIs(spec: OpenAPIV3.Document): APIMap {
    const validator = this.getValidator(spec);
    const apiMap = validator.listAPIs();
    return apiMap;
  }

  private getValidator(spec: OpenAPIV3.Document): Validator {
    if (this.validator) {
      return this.validator;
    }
    const validator = ValidatorFactory.create(spec, this.options);
    this.validator = validator;
    return validator;
  }
}
