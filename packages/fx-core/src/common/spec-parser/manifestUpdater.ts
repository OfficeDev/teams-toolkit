// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import {
  Command,
  PartialManifest,
  ComposeExtension,
  Parameter,
  ErrorType,
  WarningResult,
  WarningType,
} from "./interfaces";
import fs from "fs-extra";
import path from "path";
import { getRelativePath, updateFirstLetter } from "./utils";
import { SpecParserError } from "./specParserError";
import { ConstantString } from "./constants";
import { format } from "util";

export async function updateManifest(
  manifestPath: string,
  outputSpecPath: string,
  adaptiveCardFolder: string,
  spec: OpenAPIV3.Document
): Promise<[PartialManifest, WarningResult[]]> {
  try {
    // TODO: manifest interface can be updated when manifest parser library is ready
    const originalManifest: PartialManifest = await fs.readJSON(manifestPath);

    const [commands, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);
    const ComposeExtension: ComposeExtension = {
      composeExtensionType: "apiBased",
      apiSpecificationFile: getRelativePath(manifestPath, outputSpecPath),
      commands: commands,
    };

    const updatedPart: PartialManifest = {
      description: {
        short: spec.info.title,
        full: spec.info.description ?? originalManifest.description.full,
      },
      composeExtensions: [ComposeExtension],
    };

    const updatedManifest = { ...originalManifest, ...updatedPart };

    return [updatedManifest, warnings];
  } catch (err) {
    throw new SpecParserError((err as Error).toString(), ErrorType.UpdateManifestFailed);
  }
}

export function generateParametersFromSchema(
  schema: OpenAPIV3.SchemaObject,
  name: string
): Parameter[] {
  const parameters: Parameter[] = [];

  if (
    schema.type === "string" ||
    schema.type === "integer" ||
    schema.type === "boolean" ||
    schema.type === "number"
  ) {
    if (schema.required) {
      parameters.push({
        name: name,
        title: updateFirstLetter(name),
        description: schema.description ?? "",
      });
    }
  } else if (schema.type === "object") {
    const { properties } = schema;
    for (const property in properties) {
      const result = generateParametersFromSchema(
        properties[property] as OpenAPIV3.SchemaObject,
        property
      );

      parameters.push(...result);
    }
  }

  return parameters;
}

export async function generateCommands(
  spec: OpenAPIV3.Document,
  adaptiveCardFolder: string,
  manifestPath: string
): Promise<[Command[], WarningResult[]]> {
  const paths = spec.paths;
  const commands: Command[] = [];
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
              const parameters: Parameter[] = [];
              const paramObject = operationItem.parameters as OpenAPIV3.ParameterObject[];

              if (paramObject) {
                paramObject.forEach((param: OpenAPIV3.ParameterObject) => {
                  if (param.required) {
                    parameters.push({
                      name: param.name,
                      title: updateFirstLetter(param.name),
                      description: param.description ?? "",
                    });
                  }
                });
              }

              if (operationItem.requestBody) {
                const requestJson = (operationItem.requestBody as OpenAPIV3.RequestBodyObject)
                  .content["application/json"];
                if (Object.keys(requestJson).length !== 0) {
                  const schema = requestJson.schema as OpenAPIV3.SchemaObject;
                  const result = generateParametersFromSchema(schema, "requestBody");
                  parameters.push(...result);
                }
              }

              const operationId = operationItem.operationId!;

              const adaptiveCardPath = path.join(adaptiveCardFolder, operationId + ".json");

              if (parameters.length === 0) {
                warnings.push({
                  type: WarningType.OperationOnlyContainsOptionalParam,
                  content: format(ConstantString.OperationOnlyContainsOptionalParam, operationId),
                  data: operationId,
                });
                continue;
              }

              const command: Command = {
                context: ["compose"],
                type: "query",
                title: operationItem.summary ?? "",
                id: operationId,
                parameters: parameters,
                apiResponseRenderingTemplateFile: (await fs.pathExists(adaptiveCardPath))
                  ? getRelativePath(manifestPath, adaptiveCardPath)
                  : "",
              };
              commands.push(command);
            }
          }
        }
      }
    }
  }

  return [commands, warnings];
}
