// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as util from "util";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { SpecParserError } from "./specParserError";
import {
  AdaptiveCard,
  ErrorResult,
  ErrorType,
  GenerateResult,
  ValidateResult,
  ValidationStatus,
  WarningResult,
  WarningType,
} from "./interfaces";
import { ConstantString } from "./constants";
import jsyaml from "js-yaml";
import fs from "fs-extra";
import { specFilter } from "./specFilter";
import { convertPathToCamelCase, isSupportedApi, validateServer } from "./utils";
import { updateManifest } from "./manifestUpdater";
import { generateAdaptiveCard } from "./adaptiveCardGenerator";
import path from "path";

/**
 * A class that parses an OpenAPI specification file and provides methods to validate, list, and generate artifacts.
 */
export class SpecParser {
  public readonly specPath: string;
  public readonly parser: SwaggerParser;

  private apiMap: { [key: string]: OpenAPIV3.PathItemObject } | undefined;
  private spec: OpenAPIV3.Document | undefined;
  private unResolveSpec: OpenAPIV3.Document | undefined;

  /**
   * Creates a new instance of the SpecParser class.
   * @param path The URL or file path of the OpenAPI specification file. The OpenAPI specification file must have a version of 3.0 or higher.
   */
  constructor(path: string) {
    this.specPath = path;
    this.parser = new SwaggerParser();
  }

  /**
   * Validates the OpenAPI specification file and returns a validation result.
   *
   * @returns A validation result object that contains information about any errors or warnings in the specification file.
   */
  async validate(): Promise<ValidateResult> {
    try {
      const errors: ErrorResult[] = [];
      const warnings: WarningResult[] = [];
      try {
        await this.loadSpec();
        await this.parser.validate(this.spec!);
      } catch (e) {
        // Spec not valid
        errors.push({ type: ErrorType.SpecNotValid, content: (e as Error).toString() });
        return {
          status: ValidationStatus.Error,
          warnings,
          errors,
        };
      }

      // TODO: we will support swagger 2.0
      if (!this.spec!.openapi || this.spec!.openapi < "3.0.0") {
        errors.push({
          type: ErrorType.VersionNotSupported,
          content: ConstantString.SpecVersionNotSupported,
          data: this.spec!.openapi,
        });
        return {
          status: ValidationStatus.Error,
          warnings,
          errors,
        };
      }

      // Server validation
      const serverErrors = validateServer(this.spec!);
      errors.push(...serverErrors);

      // Remote reference not supported
      const refPaths = this.parser.$refs.paths();

      // refPaths [0] is the current spec file path
      if (refPaths.length > 1) {
        errors.push({
          type: ErrorType.RemoteRefNotSupported,
          content: util.format(ConstantString.RemoteRefNotSupported, refPaths.join(", ")),
          data: refPaths,
        });
      }

      // No supported API
      const apiMap = this.getAllSupportedApi(this.spec!);
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
          content: util.format(
            ConstantString.MissingOperationId,
            apisMissingOperationId.join(", ")
          ),
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
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.ValidateFailed);
    }
  }

  /**
   * Lists all the OpenAPI operations in the specification file.
   * @returns A string array that represents the HTTP method and path of each operation, such as ['GET /pets/{petId}', 'GET /user/{userId}']
   * according to copilot plugin spec, only list get and post method without auth
   */
  async list(): Promise<string[]> {
    try {
      await this.loadSpec();
      const apiMap = this.getAllSupportedApi(this.spec!);
      return Array.from(Object.keys(apiMap));
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.ListFailed);
    }
  }

  /**
   * List all the OpenAPI operations in the specification file and return a map of operationId and operation path.
   * @returns A map of operationId and operation path, such as [{'getPetById': 'GET /pets/{petId}'}, {'getUser': 'GET /user/{userId}'}]
   */
  async listOperationMap(): Promise<Map<string, string>> {
    try {
      await this.loadSpec();
      const apiMap = this.getAllSupportedApi(this.spec!);
      const operationMap = new Map<string, string>();
      for (const key in apiMap) {
        const pathObjectItem = apiMap[key];
        let operationId = pathObjectItem.operationId;
        if (!operationId) {
          const [method, path] = key.split(" ");
          const methodName = method.toLowerCase();
          operationId = `${methodName}${convertPathToCamelCase(path)}`;
        }
        operationMap.set(operationId, key);
      }
      return operationMap;
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.ListOperationMapFailed);
    }
  }

  /**
   * Generates and update artifacts from the OpenAPI specification file. Generate Adaptive Cards, update Teams app manifest, and generate a new OpenAPI specification file.
   * @param manifestPath A file path of the Teams app manifest file to update.
   * @param filter An array of strings that represent the filters to apply when generating the artifacts. If filter is empty, it would process nothing.
   * @param outputSpecPath File path of the new OpenAPI specification file to generate. If not specified or empty, no spec file will be generated.
   * @param adaptiveCardFolder Folder path where the Adaptive Card files will be generated. If not specified or empty, Adaptive Card files will not be generated.
   */
  async generate(
    manifestPath: string,
    filter: string[],
    outputSpecPath: string,
    adaptiveCardFolder: string,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    const result: GenerateResult = {
      allSuccess: true,
      warnings: [],
    };
    try {
      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      await this.loadSpec();
      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const newUnResolvedSpec = specFilter(filter, this.unResolveSpec!, this.spec!);
      let resultStr;
      if (outputSpecPath.endsWith(".yaml") || outputSpecPath.endsWith(".yml")) {
        resultStr = jsyaml.dump(newUnResolvedSpec);
      } else {
        resultStr = JSON.stringify(newUnResolvedSpec, null, 2);
      }
      await fs.outputFile(outputSpecPath, resultStr);

      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const newSpec = (await this.parser.dereference(newUnResolvedSpec)) as OpenAPIV3.Document;

      for (const url in newSpec.paths) {
        for (const method in newSpec.paths[url]) {
          if (method === ConstantString.GetMethod || method === ConstantString.PostMethod) {
            const operation = newSpec.paths[url]![method] as OpenAPIV3.OperationObject;
            try {
              const card: AdaptiveCard = generateAdaptiveCard(operation);
              const fileName = path.join(adaptiveCardFolder, `${operation.operationId!}.json`);
              await fs.outputJSON(fileName, card, { spaces: 2 });
            } catch (err) {
              result.allSuccess = false;
              result.warnings.push({
                type: WarningType.GenerateCardFailed,
                content: (err as Error).toString(),
                data: operation.operationId!,
              });
            }
          }
        }
      }

      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const [updatedManifest, warnings] = await updateManifest(
        manifestPath,
        outputSpecPath,
        adaptiveCardFolder,
        newSpec
      );

      await fs.outputJSON(manifestPath, updatedManifest, { spaces: 2 });

      result.warnings.push(...warnings);
    } catch (err) {
      if (err instanceof SpecParserError) {
        throw err;
      }
      throw new SpecParserError((err as Error).toString(), ErrorType.GenerateFailed);
    }

    return result;
  }

  private async loadSpec(): Promise<void> {
    if (!this.spec) {
      this.unResolveSpec = (await this.parser.parse(this.specPath)) as OpenAPIV3.Document;
      const clonedUnResolveSpec = JSON.parse(JSON.stringify(this.unResolveSpec));
      this.spec = (await this.parser.dereference(clonedUnResolveSpec)) as OpenAPIV3.Document;
    }
  }

  private getAllSupportedApi(spec: OpenAPIV3.Document): {
    [key: string]: OpenAPIV3.OperationObject;
  } {
    if (this.apiMap !== undefined) {
      return this.apiMap;
    }
    const paths = spec.paths;
    const result: { [key: string]: OpenAPIV3.OperationObject } = {};
    for (const path in paths) {
      const methods = paths[path];
      for (const method in methods) {
        // For developer preview, only support GET operation with only 1 parameter without auth
        if (isSupportedApi(method, path, spec)) {
          const operationObject = (methods as any)[method] as OpenAPIV3.OperationObject;
          result[`${method.toUpperCase()} ${path}`] = operationObject;
        }
      }
    }
    this.apiMap = result;
    return result;
  }
}
