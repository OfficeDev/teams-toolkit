// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import converter from "swagger2openapi";
import jsyaml from "js-yaml";
import fs from "fs-extra";
import path from "path";
import {
  APIInfo,
  APIMap,
  AuthInfo,
  ErrorType,
  GenerateResult,
  ListAPIInfo,
  ListAPIResult,
  ParseOptions,
  ProjectType,
  ValidateResult,
  ValidationStatus,
  WarningType,
} from "./interfaces";
import { ConstantString } from "./constants";
import { SpecParserError } from "./specParserError";
import { SpecFilter } from "./specFilter";
import { Utils } from "./utils";
import { ManifestUpdater } from "./manifestUpdater";
import { AdaptiveCardGenerator } from "./adaptiveCardGenerator";
import { wrapAdaptiveCard } from "./adaptiveCardWrapper";

/**
 * A class that parses an OpenAPI specification file and provides methods to validate, list, and generate artifacts.
 */
export class SpecParser {
  public readonly pathOrSpec: string | OpenAPIV3.Document;
  public readonly parser: SwaggerParser;
  public readonly options: Required<ParseOptions>;

  private apiMap: APIMap | undefined;
  private spec: OpenAPIV3.Document | undefined;
  private unResolveSpec: OpenAPIV3.Document | undefined;
  private isSwaggerFile: boolean | undefined;

  private defaultOptions: ParseOptions = {
    allowMissingId: true,
    allowSwagger: true,
    allowAPIKeyAuth: false,
    allowBearerTokenAuth: false,
    allowMultipleParameters: false,
    allowOauth2: false,
    allowMethods: ["get", "post"],
    projectType: ProjectType.SME,
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
        await this.parser.validate(this.spec!);
      } catch (e) {
        return {
          status: ValidationStatus.Error,
          warnings: [],
          errors: [{ type: ErrorType.SpecNotValid, content: (e as Error).toString() }],
        };
      }

      if (!this.options.allowSwagger && this.isSwaggerFile) {
        return {
          status: ValidationStatus.Error,
          warnings: [],
          errors: [
            { type: ErrorType.SwaggerNotSupported, content: ConstantString.SwaggerNotSupported },
          ],
        };
      }

      if (
        this.options.projectType === ProjectType.SME ||
        this.options.projectType === ProjectType.Copilot
      ) {
        if (this.spec!.openapi >= "3.1.0") {
          return {
            status: ValidationStatus.Error,
            warnings: [],
            errors: [
              {
                type: ErrorType.SpecVersionNotSupported,
                content: Utils.format(ConstantString.SpecVersionNotSupported, this.spec!.openapi),
                data: this.spec!.openapi,
              },
            ],
          };
        }
      }

      return Utils.validateSpec(this.spec!, this.parser, !!this.isSwaggerFile, this.options);
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.ValidateFailed);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async listSupportedAPIInfo(): Promise<APIInfo[]> {
    throw new Error("Method not implemented.");
  }

  /**
   * Lists all the OpenAPI operations in the specification file.
   * @returns A string array that represents the HTTP method and path of each operation, such as ['GET /pets/{petId}', 'GET /user/{userId}']
   * according to copilot plugin spec, only list get and post method without auth
   */
  async list(): Promise<ListAPIResult> {
    try {
      await this.loadSpec();
      const spec = this.spec!;
      const apiMap = this.getAPIs(spec);
      const result: ListAPIResult = {
        APIs: [],
        allAPICount: 0,
        validAPICount: 0,
      };
      for (const apiKey in apiMap) {
        const { operation, isValid, reason } = apiMap[apiKey];
        const [method, path] = apiKey.split(" ");

        const apiResult: ListAPIInfo = {
          api: "",
          server: "",
          operationId: "",
          isValid: isValid,
          reason: reason,
        };

        const rootServer = spec.servers && spec.servers[0];
        const methodServer = spec.paths[path]!.servers && spec.paths[path]?.servers![0];
        const operationServer = operation.servers && operation.servers[0];

        const serverUrl = operationServer || methodServer || rootServer;
        if (!serverUrl) {
          throw new SpecParserError(
            ConstantString.NoServerInformation,
            ErrorType.NoServerInformation
          );
        }

        apiResult.server = Utils.resolveServerUrl(serverUrl.url);

        let operationId = operation.operationId;
        if (!operationId) {
          operationId = `${method.toLowerCase()}${Utils.convertPathToCamelCase(path)}`;
        }
        apiResult.operationId = operationId;

        const authArray = Utils.getAuthArray(operation.security, spec);

        for (const auths of authArray) {
          if (auths.length === 1) {
            apiResult.auth = auths[0];
            break;
          }
        }

        apiResult.api = apiKey;
        result.APIs.push(apiResult);
      }

      result.allAPICount = result.APIs.length;
      result.validAPICount = result.APIs.filter((api) => api.isValid).length;

      return result;
    } catch (err) {
      if (err instanceof SpecParserError) {
        throw err;
      }
      throw new SpecParserError((err as Error).toString(), ErrorType.ListFailed);
    }
  }

  /**
   * Generate specs according to the filters.
   * @param filter An array of strings that represent the filters to apply when generating the artifacts. If filter is empty, it would process nothing.
   */
  async getFilteredSpecs(
    filter: string[],
    signal?: AbortSignal
  ): Promise<[OpenAPIV3.Document, OpenAPIV3.Document]> {
    try {
      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      await this.loadSpec();
      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const newUnResolvedSpec = SpecFilter.specFilter(
        filter,
        this.unResolveSpec!,
        this.spec!,
        this.options
      );

      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const newSpec = (await this.parser.dereference(newUnResolvedSpec)) as OpenAPIV3.Document;
      return [newUnResolvedSpec, newSpec];
    } catch (err) {
      if (err instanceof SpecParserError) {
        throw err;
      }
      throw new SpecParserError((err as Error).toString(), ErrorType.GetSpecFailed);
    }
  }

  /**
   * Generates and update artifacts from the OpenAPI specification file. Generate Adaptive Cards, update Teams app manifest, and generate a new OpenAPI specification file.
   * @param manifestPath A file path of the Teams app manifest file to update.
   * @param filter An array of strings that represent the filters to apply when generating the artifacts. If filter is empty, it would process nothing.
   * @param outputSpecPath File path of the new OpenAPI specification file to generate. If not specified or empty, no spec file will be generated.
   * @param pluginFilePath File path of the api plugin file to generate.
   */
  async generateForCopilot(
    manifestPath: string,
    filter: string[],
    outputSpecPath: string,
    pluginFilePath: string,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    const result: GenerateResult = {
      allSuccess: true,
      warnings: [],
    };

    try {
      const newSpecs = await this.getFilteredSpecs(filter, signal);
      const newUnResolvedSpec = newSpecs[0];
      const newSpec = newSpecs[1];

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

      const [updatedManifest, apiPlugin] = await ManifestUpdater.updateManifestWithAiPlugin(
        manifestPath,
        outputSpecPath,
        pluginFilePath,
        newSpec,
        this.options
      );

      await fs.outputJSON(manifestPath, updatedManifest, { spaces: 2 });
      await fs.outputJSON(pluginFilePath, apiPlugin, { spaces: 2 });
    } catch (err) {
      if (err instanceof SpecParserError) {
        throw err;
      }
      throw new SpecParserError((err as Error).toString(), ErrorType.GenerateFailed);
    }

    return result;
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
    adaptiveCardFolder?: string,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    const result: GenerateResult = {
      allSuccess: true,
      warnings: [],
    };
    try {
      const newSpecs = await this.getFilteredSpecs(filter, signal);
      const newUnResolvedSpec = newSpecs[0];
      const newSpec = newSpecs[1];

      let hasMultipleAuth = false;
      let authInfo: AuthInfo | undefined = undefined;

      for (const url in newSpec.paths) {
        for (const method in newSpec.paths[url]) {
          const operation = (newSpec.paths[url] as any)[method] as OpenAPIV3.OperationObject;

          const authArray = Utils.getAuthArray(operation.security, newSpec);

          if (authArray && authArray.length > 0) {
            const currentAuth = authArray[0][0];
            if (!authInfo) {
              authInfo = authArray[0][0];
            } else if (authInfo.name !== currentAuth.name) {
              hasMultipleAuth = true;
              break;
            }
          }
        }
      }

      if (hasMultipleAuth && this.options.projectType !== ProjectType.TeamsAi) {
        throw new SpecParserError(
          ConstantString.MultipleAuthNotSupported,
          ErrorType.MultipleAuthNotSupported
        );
      }

      let resultStr;
      if (outputSpecPath.endsWith(".yaml") || outputSpecPath.endsWith(".yml")) {
        resultStr = jsyaml.dump(newUnResolvedSpec);
      } else {
        resultStr = JSON.stringify(newUnResolvedSpec, null, 2);
      }
      await fs.outputFile(outputSpecPath, resultStr);

      if (adaptiveCardFolder) {
        for (const url in newSpec.paths) {
          for (const method in newSpec.paths[url]) {
            // paths object may contain description/summary which is not a http method, so we need to check if it is a operation object
            if (this.options.allowMethods.includes(method)) {
              const operation = (newSpec.paths[url] as any)[method] as OpenAPIV3.OperationObject;
              try {
                const [card, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operation);
                const fileName = path.join(adaptiveCardFolder, `${operation.operationId!}.json`);
                const wrappedCard = wrapAdaptiveCard(card, jsonPath);
                await fs.outputJSON(fileName, wrappedCard, { spaces: 2 });
                const dataFileName = path.join(
                  adaptiveCardFolder,
                  `${operation.operationId!}.data.json`
                );
                await fs.outputJSON(dataFileName, {}, { spaces: 2 });
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
      }

      if (signal?.aborted) {
        throw new SpecParserError(ConstantString.CancelledMessage, ErrorType.Cancelled);
      }

      const [updatedManifest, warnings] = await ManifestUpdater.updateManifest(
        manifestPath,
        outputSpecPath,
        newSpec,
        this.options,
        adaptiveCardFolder,
        authInfo
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
      this.unResolveSpec = (await this.parser.parse(this.pathOrSpec)) as OpenAPIV3.Document;
      // Convert swagger 2.0 to openapi 3.0
      if (!this.unResolveSpec.openapi && (this.unResolveSpec as any).swagger === "2.0") {
        const specObj = await converter.convert(this.unResolveSpec as any, {});
        this.unResolveSpec = specObj.openapi as OpenAPIV3.Document;
        this.isSwaggerFile = true;
      }

      const clonedUnResolveSpec = JSON.parse(JSON.stringify(this.unResolveSpec));
      this.spec = (await this.parser.dereference(clonedUnResolveSpec)) as OpenAPIV3.Document;
    }
  }

  private getAPIs(spec: OpenAPIV3.Document): APIMap {
    if (this.apiMap !== undefined) {
      return this.apiMap;
    }
    const result = Utils.listAPIs(spec, this.options);
    this.apiMap = result;
    return result;
  }
}
