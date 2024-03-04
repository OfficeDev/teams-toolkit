// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import fs from "fs-extra";
import path from "path";
import { ErrorType, WarningResult } from "./interfaces";
import { Utils } from "./utils";
import { SpecParserError } from "./specParserError";
import { ConstantString } from "./constants";
import {
  IComposeExtension,
  IMessagingExtensionCommand,
  TeamsAppManifest,
  PluginManifestSchema,
  FunctionObject,
  FunctionParameters,
  FunctionParameter,
} from "@microsoft/teams-manifest";

export class ManifestUpdater {
  static async updateManifestWithAiPlugin(
    manifestPath: string,
    outputSpecPath: string,
    spec: OpenAPIV3.Document
  ): Promise<[TeamsAppManifest, PluginManifestSchema]> {
    const manifest: TeamsAppManifest = await fs.readJSON(manifestPath);
    manifest.apiPlugins = [
      {
        pluginFile: ConstantString.ApiPluginDefaultName,
      },
    ];

    ManifestUpdater.updateManifestDescription(manifest, spec);

    const specRelativePath = ManifestUpdater.getRelativePath(manifestPath, outputSpecPath);
    const apiPlugin = ManifestUpdater.generatePluginManifestSchema(spec, specRelativePath);

    return [manifest, apiPlugin];
  }

  static updateManifestDescription(manifest: TeamsAppManifest, spec: OpenAPIV3.Document): void {
    manifest.description = {
      short: spec.info.title.slice(0, ConstantString.ShortDescriptionMaxLens),
      full: (spec.info.description ?? manifest.description.full)?.slice(
        0,
        ConstantString.FullDescriptionMaxLens
      ),
    };
  }

  static mapOpenAPISchemaToFuncParam(
    schema: OpenAPIV3.SchemaObject,
    method: string,
    pathUrl: string
  ): FunctionParameter {
    let parameter: FunctionParameter;
    if (
      schema.type === "string" ||
      schema.type === "boolean" ||
      schema.type === "integer" ||
      schema.type === "number" ||
      schema.type === "array"
    ) {
      parameter = schema as any;
    } else {
      throw new SpecParserError(
        Utils.format(ConstantString.UnsupportedSchema, method, pathUrl, JSON.stringify(schema)),
        ErrorType.UpdateManifestFailed
      );
    }

    return parameter;
  }

  static generatePluginManifestSchema(
    spec: OpenAPIV3.Document,
    specRelativePath: string
  ): PluginManifestSchema {
    const functions: FunctionObject[] = [];
    const functionNames: string[] = [];

    const paths = spec.paths;

    for (const pathUrl in paths) {
      const pathItem = paths[pathUrl];
      if (pathItem) {
        const operations = pathItem;
        for (const method in operations) {
          if (ConstantString.AllOperationMethods.includes(method)) {
            const operationItem = (operations as any)[method] as OpenAPIV3.OperationObject;
            if (operationItem) {
              const operationId = operationItem.operationId!;
              const description = operationItem.description ?? "";
              const paramObject = operationItem.parameters as OpenAPIV3.ParameterObject[];
              const requestBody = operationItem.requestBody as OpenAPIV3.ParameterObject;

              const parameters: FunctionParameters = {
                type: "object",
                properties: {},
                required: [],
              };

              if (paramObject) {
                for (let i = 0; i < paramObject.length; i++) {
                  const param = paramObject[i];

                  const schema = param.schema as OpenAPIV3.SchemaObject;

                  parameters.properties![param.name] = ManifestUpdater.mapOpenAPISchemaToFuncParam(
                    schema,
                    method,
                    pathUrl
                  );

                  if (param.required) {
                    parameters.required!.push(param.name);
                  }

                  if (!parameters.properties![param.name].description) {
                    parameters.properties![param.name].description = param.description ?? "";
                  }
                }
              }

              if (requestBody) {
                const requestJsonBody = requestBody.content!["application/json"];
                const requestBodySchema = requestJsonBody.schema as OpenAPIV3.SchemaObject;

                if (requestBodySchema.type === "object") {
                  if (requestBodySchema.required) {
                    parameters.required!.push(...requestBodySchema.required);
                  }

                  for (const property in requestBodySchema.properties) {
                    const schema = requestBodySchema.properties[property] as OpenAPIV3.SchemaObject;
                    parameters.properties![property] = ManifestUpdater.mapOpenAPISchemaToFuncParam(
                      schema,
                      method,
                      pathUrl
                    );
                  }
                } else {
                  throw new SpecParserError(
                    Utils.format(
                      ConstantString.UnsupportedSchema,
                      method,
                      pathUrl,
                      JSON.stringify(requestBodySchema)
                    ),
                    ErrorType.UpdateManifestFailed
                  );
                }
              }

              const funcObj: FunctionObject = {
                name: operationId,
                description: description,
                parameters: parameters,
                states: {
                  reasoning: {
                    description: ConstantString.ReasoningDescription,
                    instructions: [ConstantString.ReasoningInstruction],
                  },
                  responding: {
                    description: ConstantString.RespondingDescription,
                    instructions: [ConstantString.RespondingInstruction],
                  },
                },
              };

              functions.push(funcObj);
              functionNames.push(operationId);
            }
          }
        }
      }
    }

    const apiPlugin: PluginManifestSchema = {
      schema_version: "v2",
      name_for_human: spec.info.title,
      description_for_human: spec.info.description ?? "<Please add description of the plugin>",
      functions: functions,
      runtimes: [
        {
          type: "OpenApi",
          auth: {
            type: "none", // TODO, support auth in the future
          },
          spec: {
            url: specRelativePath,
          },
          run_for_functions: functionNames,
        },
      ],
    };

    return apiPlugin;
  }

  static async updateManifest(
    manifestPath: string,
    outputSpecPath: string,
    adaptiveCardFolder: string,
    spec: OpenAPIV3.Document,
    allowMultipleParameters: boolean,
    auth?: OpenAPIV3.SecuritySchemeObject,
    isMe?: boolean
  ): Promise<[TeamsAppManifest, WarningResult[]]> {
    try {
      const originalManifest: TeamsAppManifest = await fs.readJSON(manifestPath);
      const updatedPart: any = {};
      const [commands, warnings] = await ManifestUpdater.generateCommands(
        spec,
        adaptiveCardFolder,
        manifestPath,
        allowMultipleParameters
      );
      const composeExtension: IComposeExtension = {
        composeExtensionType: "apiBased",
        apiSpecificationFile: ManifestUpdater.getRelativePath(manifestPath, outputSpecPath),
        commands: commands,
      };

      if (auth) {
        if (Utils.isAPIKeyAuth(auth)) {
          auth = auth as OpenAPIV3.ApiKeySecurityScheme;
          const safeApiSecretRegistrationId = Utils.getSafeRegistrationIdEnvName(
            `${auth.name}_${ConstantString.RegistrationIdPostfix}`
          );
          (composeExtension as any).authorization = {
            authType: "apiSecretServiceAuth",
            apiSecretServiceAuthConfiguration: {
              apiSecretRegistrationId: `\${{${safeApiSecretRegistrationId}}}`,
            },
          };
        } else if (Utils.isBearerTokenAuth(auth)) {
          (composeExtension as any).authorization = {
            authType: "microsoftEntra",
            microsoftEntraConfiguration: {
              supportsSingleSignOn: true,
            },
          };

          updatedPart.webApplicationInfo = {
            id: "${{AAD_APP_CLIENT_ID}}",
            resource: "api://${{DOMAIN}}/${{AAD_APP_CLIENT_ID}}",
          };
        }
      }

      updatedPart.description = originalManifest.description;
      ManifestUpdater.updateManifestDescription(updatedPart, spec);
      updatedPart.composeExtensions = isMe === undefined || isMe === true ? [composeExtension] : [];

      const updatedManifest = { ...originalManifest, ...updatedPart };

      return [updatedManifest, warnings];
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.UpdateManifestFailed);
    }
  }

  static async generateCommands(
    spec: OpenAPIV3.Document,
    adaptiveCardFolder: string,
    manifestPath: string,
    allowMultipleParameters: boolean
  ): Promise<[IMessagingExtensionCommand[], WarningResult[]]> {
    const paths = spec.paths;
    const commands: IMessagingExtensionCommand[] = [];
    const warnings: WarningResult[] = [];
    if (paths) {
      for (const pathUrl in paths) {
        const pathItem = paths[pathUrl];
        if (pathItem) {
          const operations = pathItem;

          // Currently only support GET and POST method
          for (const method in operations) {
            if (method === ConstantString.PostMethod || method === ConstantString.GetMethod) {
              const operationItem = operations[method];
              if (operationItem) {
                const [command, warning] = Utils.parseApiInfo(
                  operationItem,
                  allowMultipleParameters
                );

                const adaptiveCardPath = path.join(adaptiveCardFolder, command.id + ".json");
                command.apiResponseRenderingTemplateFile = (await fs.pathExists(adaptiveCardPath))
                  ? ManifestUpdater.getRelativePath(manifestPath, adaptiveCardPath)
                  : "";

                if (warning) {
                  warnings.push(warning);
                }

                commands.push(command);
              }
            }
          }
        }
      }
    }

    return [commands, warnings];
  }

  static getRelativePath(from: string, to: string): string {
    const relativePath = path.relative(path.dirname(from), to);
    return path.normalize(relativePath).replace(/\\/g, "/");
  }
}
