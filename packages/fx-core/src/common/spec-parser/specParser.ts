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
  ValidateResult,
  ValidationStatus,
  WarningResult,
  WarningType,
} from "./interfaces";
import { ConstantString } from "./constants";
import jsyaml from "js-yaml";
import fs from "fs-extra";
import { specFilter } from "./specFilter";
import { isSupportedApi } from "./utils";
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

      // Spec version not supported
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

      // Server information invalid
      if (!this.spec!.servers || this.spec!.servers.length === 0) {
        errors.push({
          type: ErrorType.NoServerInformation,
          content: ConstantString.NoServerInformation,
        });
      } else if (this.spec!.servers.length > 1) {
        errors.push({
          type: ErrorType.MultipleServerInformation,
          content: ConstantString.MultipleServerInformation,
          data: this.spec!.servers,
        });
      }

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
  ): Promise<void> {
    try {
      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      await this.loadSpec();
      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const newUnResolvedSpec = specFilter(filter, this.unResolveSpec!);
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

      const updatedManifest = await updateManifest(
        manifestPath,
        outputSpecPath,
        adaptiveCardFolder,
        newSpec
      );

      await fs.outputJSON(manifestPath, updatedManifest, { spaces: 2 });

      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      for (const url in newSpec.paths) {
        const getOperation = newSpec.paths[url]?.get;
        const card: AdaptiveCard = generateAdaptiveCard(getOperation!);
        const fileName = path.join(adaptiveCardFolder, `${getOperation!.operationId!}.json`);
        await fs.outputJSON(fileName, card, { spaces: 2 });
      }
    } catch (err) {
      if (err instanceof SpecParserError) {
        throw err;
      }
      throw new SpecParserError((err as Error).toString(), ErrorType.GenerateFailed);
    }
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
