// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import fs from "fs-extra";
import path from "path";
import {
  AuthInfo,
  ErrorType,
  ParseOptions,
  ProjectType,
  WarningResult,
  WarningType,
} from "./interfaces";
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
  AuthObject,
} from "@microsoft/teams-manifest";
import { AdaptiveCardGenerator } from "./adaptiveCardGenerator";
import { wrapResponseSemantics } from "./adaptiveCardWrapper";

export class ManifestUpdater {
  static async updateManifestWithAiPlugin(
    manifestPath: string,
    outputSpecPath: string,
    apiPluginFilePath: string,
    spec: OpenAPIV3.Document,
    options: ParseOptions,
    authInfo?: AuthInfo
  ): Promise<[TeamsAppManifest, PluginManifestSchema]> {
    const manifest: TeamsAppManifest = await fs.readJSON(manifestPath);
    const apiPluginRelativePath = ManifestUpdater.getRelativePath(manifestPath, apiPluginFilePath);
    manifest.plugins = [
      {
        file: apiPluginRelativePath,
        id: ConstantString.DefaultPluginId,
      },
    ];

    const appName = this.removeEnvs(manifest.name.short);

    ManifestUpdater.updateManifestDescription(manifest, spec);

    const specRelativePath = ManifestUpdater.getRelativePath(manifestPath, outputSpecPath);
    const apiPlugin = await ManifestUpdater.generatePluginManifestSchema(
      spec,
      specRelativePath,
      apiPluginFilePath,
      appName,
      authInfo,
      options
    );

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

  static async generatePluginManifestSchema(
    spec: OpenAPIV3.Document,
    specRelativePath: string,
    apiPluginFilePath: string,
    appName: string,
    authInfo: AuthInfo | undefined,
    options: ParseOptions
  ): Promise<PluginManifestSchema> {
    const functions: FunctionObject[] = [];
    const functionNames: string[] = [];
    const conversationStarters: string[] = [];

    const paths = spec.paths;

    const pluginAuthObj: AuthObject = {
      type: "None",
    };

    if (authInfo) {
      if (Utils.isOAuthWithAuthCodeFlow(authInfo.authScheme)) {
        pluginAuthObj.type = "OAuthPluginVault";
      } else if (Utils.isBearerTokenAuth(authInfo.authScheme)) {
        pluginAuthObj.type = "ApiKeyPluginVault";
      }

      if (pluginAuthObj.type !== "None") {
        pluginAuthObj.reference_id = `${Utils.getSafeRegistrationIdEnvName(
          authInfo.name
        )}_REGISTRATION_ID`;
      }
    }

    for (const pathUrl in paths) {
      const pathItem = paths[pathUrl];
      if (pathItem) {
        const operations = pathItem;
        for (const method in operations) {
          if (options.allowMethods!.includes(method)) {
            const operationItem = (operations as any)[method] as OpenAPIV3.OperationObject;
            if (operationItem) {
              const operationId = operationItem.operationId!;
              const description = operationItem.description ?? "";
              const paramObject = operationItem.parameters as OpenAPIV3.ParameterObject[];
              const requestBody = operationItem.requestBody as OpenAPIV3.ParameterObject;

              const parameters: Required<FunctionParameters> = {
                type: "object",
                properties: {},
                required: [],
              };

              if (paramObject) {
                for (let i = 0; i < paramObject.length; i++) {
                  const param = paramObject[i];

                  const schema = param.schema as OpenAPIV3.SchemaObject;

                  parameters.properties[param.name] = ManifestUpdater.mapOpenAPISchemaToFuncParam(
                    schema,
                    method,
                    pathUrl
                  );

                  if (param.required) {
                    parameters.required.push(param.name);
                  }

                  if (!parameters.properties[param.name].description) {
                    parameters.properties[param.name].description = param.description ?? "";
                  }
                }
              }

              if (requestBody) {
                const requestJsonBody = requestBody.content!["application/json"];
                const requestBodySchema = requestJsonBody.schema as OpenAPIV3.SchemaObject;

                if (requestBodySchema.type === "object") {
                  if (requestBodySchema.required) {
                    parameters.required.push(...requestBodySchema.required);
                  }

                  for (const property in requestBodySchema.properties) {
                    const schema = requestBodySchema.properties[property] as OpenAPIV3.SchemaObject;
                    parameters.properties[property] = ManifestUpdater.mapOpenAPISchemaToFuncParam(
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
              };

              if (options.allowResponseSemantics) {
                const [card, jsonPath] = AdaptiveCardGenerator.generateAdaptiveCard(operationItem);
                const responseSemantic = wrapResponseSemantics(card, jsonPath);
                funcObj.capabilities = {
                  response_semantics: responseSemantic,
                };
              }

              functions.push(funcObj);
              functionNames.push(operationId);
              if (description) {
                conversationStarters.push(description);
              }
            }
          }
        }
      }
    }

    let apiPlugin: PluginManifestSchema;
    if (await fs.pathExists(apiPluginFilePath)) {
      apiPlugin = await fs.readJSON(apiPluginFilePath);
    } else {
      apiPlugin = {
        schema_version: "v2.1",
        name_for_human: "",
        description_for_human: "",
        namespace: "",
        functions: [],
        runtimes: [],
      };
    }

    apiPlugin.functions = apiPlugin.functions || [];

    for (const func of functions) {
      const index = apiPlugin.functions?.findIndex((f) => f.name === func.name);
      if (index === -1) {
        apiPlugin.functions.push(func);
      } else {
        apiPlugin.functions[index] = func;
      }
    }

    apiPlugin.runtimes = apiPlugin.runtimes || [];
    const index = apiPlugin.runtimes.findIndex(
      (runtime) =>
        runtime.spec.url === specRelativePath &&
        runtime.type === "OpenApi" &&
        (runtime.auth?.type ?? "None") === pluginAuthObj.type
    );
    if (index === -1) {
      apiPlugin.runtimes.push({
        type: "OpenApi",
        auth: pluginAuthObj,
        spec: {
          url: specRelativePath,
        },
        run_for_functions: functionNames,
      });
    } else {
      apiPlugin.runtimes[index].run_for_functions = functionNames;
    }

    if (!apiPlugin.name_for_human) {
      apiPlugin.name_for_human = appName;
    }

    if (!apiPlugin.namespace) {
      apiPlugin.namespace = ManifestUpdater.removeAllSpecialCharacters(appName);
    }

    if (!apiPlugin.description_for_human) {
      apiPlugin.description_for_human =
        spec.info.description ?? "<Please add description of the plugin>";
    }

    if (options.allowConversationStarters && conversationStarters.length > 0) {
      if (!apiPlugin.capabilities) {
        apiPlugin.capabilities = {
          localization: {},
        };
      }
      if (!apiPlugin.capabilities.conversation_starters) {
        apiPlugin.capabilities.conversation_starters = conversationStarters
          .slice(0, 5)
          .map((text) => ({ text }));
      }
    }

    return apiPlugin;
  }

  static async updateManifest(
    manifestPath: string,
    outputSpecPath: string,
    spec: OpenAPIV3.Document,
    options: ParseOptions,
    adaptiveCardFolder?: string,
    authInfo?: AuthInfo
  ): Promise<[TeamsAppManifest, WarningResult[]]> {
    try {
      const originalManifest: TeamsAppManifest = await fs.readJSON(manifestPath);
      const updatedPart: any = {};
      updatedPart.composeExtensions = [];
      let warnings: WarningResult[] = [];

      if (options.projectType === ProjectType.SME) {
        const updateResult = await ManifestUpdater.generateCommands(
          spec,
          manifestPath,
          options,
          adaptiveCardFolder
        );
        const commands = updateResult[0];
        warnings = updateResult[1];

        const composeExtension: IComposeExtension = {
          composeExtensionType: "apiBased",
          apiSpecificationFile: ManifestUpdater.getRelativePath(manifestPath, outputSpecPath),
          commands: commands,
        };

        if (authInfo) {
          const auth = authInfo.authScheme;
          if (Utils.isAPIKeyAuth(auth) || Utils.isBearerTokenAuth(auth)) {
            const safeApiSecretRegistrationId = Utils.getSafeRegistrationIdEnvName(
              `${authInfo.name}_${ConstantString.RegistrationIdPostfix}`
            );
            (composeExtension as any).authorization = {
              authType: "apiSecretServiceAuth",
              apiSecretServiceAuthConfiguration: {
                apiSecretRegistrationId: `\${{${safeApiSecretRegistrationId}}}`,
              },
            };
          } else if (Utils.isOAuthWithAuthCodeFlow(auth)) {
            const safeOAuth2RegistrationId = Utils.getSafeRegistrationIdEnvName(
              `${authInfo.name}_${ConstantString.OAuthRegistrationIdPostFix}`
            );

            (composeExtension as any).authorization = {
              authType: "oAuth2.0",
              oAuthConfiguration: {
                oauthConfigurationId: `\${{${safeOAuth2RegistrationId}}}`,
              },
            };

            updatedPart.webApplicationInfo = {
              id: "${{AAD_APP_CLIENT_ID}}",
              resource: "api://${{DOMAIN}}/${{AAD_APP_CLIENT_ID}}",
            };
          }
        }

        updatedPart.composeExtensions = [composeExtension];
      }

      updatedPart.description = originalManifest.description;
      ManifestUpdater.updateManifestDescription(updatedPart, spec);

      const updatedManifest = { ...originalManifest, ...updatedPart };

      return [updatedManifest, warnings];
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.UpdateManifestFailed);
    }
  }

  static async generateCommands(
    spec: OpenAPIV3.Document,
    manifestPath: string,
    options: ParseOptions,
    adaptiveCardFolder?: string
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
            if (options.allowMethods?.includes(method)) {
              const operationItem = (operations as any)[method];
              if (operationItem) {
                const command = Utils.parseApiInfo(operationItem, options);

                if (
                  command.parameters &&
                  command.parameters.length >= 1 &&
                  command.parameters.some((param) => param.isRequired)
                ) {
                  command.parameters = command.parameters.filter((param) => param.isRequired);
                } else if (command.parameters && command.parameters.length > 0) {
                  command.parameters = [command.parameters[0]];
                  warnings.push({
                    type: WarningType.OperationOnlyContainsOptionalParam,
                    content: Utils.format(
                      ConstantString.OperationOnlyContainsOptionalParam,
                      command.id
                    ),
                    data: command.id,
                  });
                }

                if (adaptiveCardFolder) {
                  const adaptiveCardPath = path.join(adaptiveCardFolder, command.id + ".json");
                  command.apiResponseRenderingTemplateFile = (await fs.pathExists(adaptiveCardPath))
                    ? ManifestUpdater.getRelativePath(manifestPath, adaptiveCardPath)
                    : "";
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

  static removeEnvs(str: string): string {
    const placeHolderReg = /\${{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    const matches = placeHolderReg.exec(str);
    let newStr = str;
    if (matches != null) {
      newStr = newStr.replace(matches[0], "");
    }
    return newStr;
  }

  static removeAllSpecialCharacters(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
}
