// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import { Command, PartialManifest, ComposeExtension, Parameter, ErrorType } from "./interfaces";
import fs from "fs-extra";
import path from "path";
import { getRelativePath, updateFirstLetter } from "./utils";
import { SpecParserError } from "./specParserError";

export async function updateManifest(
  manifestPath: string,
  outputSpecPath: string,
  adaptiveCardFolder: string,
  spec: OpenAPIV3.Document
): Promise<PartialManifest> {
  try {
    // TODO: manifest interface can be updated when manifest parser library is ready
    const originalManifest: PartialManifest = await fs.readJSON(manifestPath);

    const commands = generateCommands(spec, adaptiveCardFolder, manifestPath);
    const ComposeExtension: ComposeExtension = {
      type: "apiBased",
      apiSpecFile: getRelativePath(manifestPath, outputSpecPath),
      commands: commands,
      supportsConversationalAI: true,
    };

    const updatedPart: PartialManifest = {
      description: {
        short: spec.info.title,
        full: spec.info.description ?? originalManifest.description.full,
      },
      composeExtensions: [ComposeExtension],
    };

    const updatedManifest = { ...originalManifest, ...updatedPart };

    return updatedManifest;
  } catch (err) {
    throw new SpecParserError((err as Error).toString(), ErrorType.UpdateManifestFailed);
  }
}

export function generateCommands(
  spec: OpenAPIV3.Document,
  adaptiveCardFolder: string,
  manifestPath: string
): Command[] {
  const paths = spec.paths;
  const commands: Command[] = [];
  if (paths) {
    for (const pathUrl in paths) {
      const pathItem = paths[pathUrl];
      if (pathItem) {
        const operations = pathItem;

        // Currently only support GET method
        const operationItem = operations.get;

        if (operationItem) {
          const parameters: Parameter[] = [];
          const paramObject = operationItem.parameters;

          if (paramObject) {
            paramObject.forEach((param: OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject) => {
              param = param as OpenAPIV3.ParameterObject;
              parameters.push({
                name: param.name,
                title: updateFirstLetter(param.name),
                description: param.description ?? "",
              });
            });
          }

          const adaptiveCardPath = path.join(
            adaptiveCardFolder,
            operationItem.operationId! + ".json"
          );

          const command: Command = {
            context: ["compose"],
            type: "query",
            title: operationItem.summary ?? "",
            id: operationItem.operationId!,
            parameters: parameters,
            apiResponseRenderingTemplate: getRelativePath(manifestPath, adaptiveCardPath),
          };
          commands.push(command);
        }
      }
    }
  }

  return commands;
}
