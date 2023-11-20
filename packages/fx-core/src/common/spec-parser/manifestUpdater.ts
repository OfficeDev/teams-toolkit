// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import { Parameter, ErrorType, WarningResult, WarningType } from "./interfaces";
import fs from "fs-extra";
import path from "path";
import { getRelativePath, updateFirstLetter } from "./utils";
import { SpecParserError } from "./specParserError";
import { ConstantString } from "./constants";
import { format } from "util";
import {
  IComposeExtension,
  IMessagingExtensionCommand,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
export async function updateManifest(
  manifestPath: string,
  outputSpecPath: string,
  adaptiveCardFolder: string,
  spec: OpenAPIV3.Document
): Promise<[TeamsAppManifest, WarningResult[]]> {
  try {
    // TODO: manifest interface can be updated when manifest parser library is ready
    const originalManifest: TeamsAppManifest = await fs.readJSON(manifestPath);

    const [commands, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);
    const ComposeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      apiSpecificationFile: getRelativePath(manifestPath, outputSpecPath),
      commands: commands,
    };

    const updatedPart = {
      description: {
        short: spec.info.title,
        full: spec.info.description ?? originalManifest.description.full,
      },
      composeExtensions: [ComposeExtension],
    };

    const updatedManifest = { ...originalManifest, ...updatedPart };
    updatedManifest.graphConnector = {
      connectionId: "<Connection Id>",
      connectionName: "<Connection Name>",
      description: spec?.paths[0]?.get?.summary ?? "",
      authenticationEntity: {
        path: "https://api.github.com/repos/{org}/{repo}/issues",
        authenticationKind: "anonymous",
      },
      schema: [
        {
          name: "IssueId",
          type: "Int64",
          fieldPath: "id",
          selectedAnnotations: ["query", "searchable"],
        },
        {
          name: "IssueTitle",
          type: "String",
          fieldPath: "title",
          selectedAnnotations: ["query", "searchable"],
          semanticLabels: ["title"],
        },
        {
          name: "IssueBody",
          type: "String",
          fieldPath: "body",
          selectedAnnotations: ["query", "searchable"],
        },
        {
          name: "IssueUserId",
          type: "String",
          fieldPath: "user.id",
          selectedAnnotations: ["query", "searchable"],
        },
      ],
      ApiParameters: {
        Url: "https://api.github.com/repos/{org}/{repo}/issues",
        Headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": ".NET Foundation Repository Reporter",
        },
        QueryParameters: ["state", "per_page", "page"],
        Pagination: {
          PageSize: 100,
          OffsetStart: 0,
          OffsetType: "page",
          Parameters: {
            Limit: "per_page",
            Offset: "page",
          },
        },
        ItemId: "IssueId",
      },
      aclSetting: {
        useItemLevelAcl: false,
      },
      identityConfiguration: {
        isIdentitySyncRequired: false,
      },
      refreshSetting: {
        fullSyncInterval: 3600,
      },
    };

    return [updatedManifest, warnings];
  } catch (err) {
    throw new SpecParserError((err as Error).toString(), ErrorType.UpdateManifestFailed);
  }
}

export function generateParametersFromSchema(
  schema: OpenAPIV3.SchemaObject,
  name: string,
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
      title: updateFirstLetter(name),
      description: schema.description ?? "",
    };
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
      const [requiredP, optionalP] = generateParametersFromSchema(
        properties[property] as OpenAPIV3.SchemaObject,
        property,
        isRequired
      );

      requiredParams.push(...requiredP);
      optionalParams.push(...optionalP);
    }
  }

  return [requiredParams, optionalParams];
}

export async function generateCommands(
  spec: OpenAPIV3.Document,
  adaptiveCardFolder: string,
  manifestPath: string
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
              const requiredParams: Parameter[] = [];
              const optionalParams: Parameter[] = [];
              const paramObject = operationItem.parameters as OpenAPIV3.ParameterObject[];

              if (paramObject) {
                paramObject.forEach((param: OpenAPIV3.ParameterObject) => {
                  const parameter: Parameter = {
                    name: param.name,
                    title: updateFirstLetter(param.name),
                    description: param.description ?? "",
                  };

                  const schema = param.schema as OpenAPIV3.SchemaObject;
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
                  const [requiredP, optionalP] = generateParametersFromSchema(
                    schema,
                    "requestBody",
                    requestBody.required
                  );
                  requiredParams.push(...requiredP);
                  optionalParams.push(...optionalP);
                }
              }

              const operationId = operationItem.operationId!;

              const adaptiveCardPath = path.join(adaptiveCardFolder, operationId + ".json");

              const parameters = [];

              if (requiredParams.length != 0) {
                parameters.push(...requiredParams);
              } else {
                parameters.push(optionalParams[0]);
              }

              const command: IMessagingExtensionCommand = {
                context: ["compose"],
                type: "query",
                title: operationItem.summary ?? "",
                id: operationId,
                parameters: parameters,
                description: operationItem.description ?? "",
                apiResponseRenderingTemplateFile: (await fs.pathExists(adaptiveCardPath))
                  ? getRelativePath(manifestPath, adaptiveCardPath)
                  : "",
              };
              commands.push(command);

              if (requiredParams.length === 0 && optionalParams.length > 1) {
                warnings.push({
                  type: WarningType.OperationOnlyContainsOptionalParam,
                  content: format(ConstantString.OperationOnlyContainsOptionalParam, operationId),
                  data: operationId,
                });
              }
            }
          }
        }
      }
    }
  }

  return [commands, warnings];
}
