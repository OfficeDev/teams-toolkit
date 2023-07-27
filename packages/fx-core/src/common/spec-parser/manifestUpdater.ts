// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import { Command, PartialManifest, ComposeExtension, Parameter } from "./interfaces";
import fs from "fs-extra";
import path from "path";
import { getRelativePath, updateFirstLetter } from "./utils";

export async function updateManifest(
  manifestPath: string,
  outputSpecPath: string,
  adaptiveCardFolder: string,
  spec: OpenAPIV3.Document
): Promise<PartialManifest> {
  const originalManifest: PartialManifest = await fs.readJSON(manifestPath);

  const commands = await generateCommands(spec, adaptiveCardFolder, manifestPath);
  const ComposeExtension: ComposeExtension = {
    type: "apiBased",
    apiSpecFile: path.basename(outputSpecPath),
    commands: commands,
  };

  const updatedPart: PartialManifest = {
    name: {
      short: spec.info.title,
      full: spec.info.title,
    },
    description: {
      short: spec.info.title,
      full: spec.info.description ?? "",
    },
    composeExtensions: [ComposeExtension],
  };

  const updatedManifest = { ...originalManifest, ...updatedPart };

  return updatedManifest;
}

export async function generateCommands(
  spec: OpenAPIV3.Document,
  adaptiveCardFolder: string,
  manifestPath: string
): Promise<Command[]> {
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
            for (const index in paramObject) {
              const param = paramObject[index] as OpenAPIV3.ParameterObject;
              parameters.push({
                name: param.name,
                title: updateFirstLetter(param.name),
                description: param.description ?? "",
              });
            }
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
