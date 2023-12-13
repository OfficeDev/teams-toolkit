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
      connectionId: "DevicesCatalog",
      connectionName: "DevicesCatalog",
      authenticationEntity: {
        path: "https://devicescatalog.contoso.com/api/v1",
        authenticationKind: "Basic",
      },
      schema: [
        {
          name: "SysUpdatedOn",
          type: "DateTime",
          fieldPath: "result.sys_updated_on",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["lastModifiedDateTime"],
        },
        {
          name: "SysUpdatedBy",
          type: "String",
          fieldPath: "result.sys_updated_by",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["lastModifiedBy"],
        },
        {
          name: "SysCreatedOn",
          type: "DateTime",
          fieldPath: "result.sys_created_on",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["createdDateTime"],
        },
        {
          name: "SysCreatedBy",
          type: "String",
          fieldPath: "result.sys_created_by",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["createdBy"],
        },
        {
          name: "Name",
          type: "String",
          fieldPath: "result.name",
          selectedAnnotations: ["search", "retrieve"],
          semanticLabels: ["title"],
        },
        {
          name: "ShortDescription",
          type: "String",
          fieldPath: "result.short_description",
          selectedAnnotations: ["search", "retrieve"],
        },
        {
          name: "Description",
          type: "String",
          fieldPath: "result.description",
          selectedAnnotations: ["search", "content"],
        },
        {
          name: "SysId",
          type: "String",
          fieldPath: "result.sys_id",
          selectedAnnotations: ["retrieve"],
        },
        {
          name: "ScCatalogs",
          type: "String",
          fieldPath: "result.sc_catalogs",
          selectedAnnotations: ["query"],
        },
        {
          name: "Category",
          type: "String",
          fieldPath: "result.category",
          selectedAnnotations: [],
        },
        {
          name: "AccessUrl",
          type: "String",
          fieldPath: "result.sys_id",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["url"],
        },
        {
          name: "IconUrl",
          type: "String",
          fieldPath: "result.sys_id",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["iconUrl"],
        },
        {
          name: "Authors",
          type: "StringCollection",
          fieldPath: "result.sys_created_by",
          selectedAnnotations: ["retrieve"],
          semanticLabels: ["authors"],
        },
      ],
      ApiParameters: {
        Url: "https://devicescatalog.contoso.com/api/v1",
        Headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": ".NET Foundation Repository Reporter",
        },
        QueryParameters: ["sysparm_limit", "sysparm_offset"],
        Pagination: {
          PageSize: 100,
          OffsetStart: 0,
          OffsetType: "item",
          Parameters: {
            Limit: "sysparm_limit",
            Offset: "sysparm_offset",
          },
        },
        ItemId: "SysId",
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
