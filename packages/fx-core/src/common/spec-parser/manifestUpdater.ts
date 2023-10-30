// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import fs from "fs-extra";
import path from "path";
import { ErrorType, WarningResult } from "./interfaces";
import { parseApiInfo } from "./utils";
import { SpecParserError } from "./specParserError";
import { ConstantString } from "./constants";
import {
  IComposeExtension,
  IMessagingExtensionCommand,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";

export async function updateManifest(
  manifestPath: string,
  outputSpecPath: string,
  adaptiveCardFolder: string,
  spec: OpenAPIV3.Document,
  apiKeyAuthName?: string
): Promise<[TeamsAppManifest, WarningResult[]]> {
  try {
    const originalManifest: TeamsAppManifest = await fs.readJSON(manifestPath);

    const [commands, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);
    const ComposeExtension: IComposeExtension = {
      composeExtensionType: "apiBased",
      apiSpecificationFile: getRelativePath(manifestPath, outputSpecPath),
      commands: commands,
    };

    if (apiKeyAuthName) {
      (ComposeExtension as any).authorization = {
        authType: "apiSecretServiceAuth",
        apiSecretServiceAuthConfiguration: {
          apiSecretRegistrationId: `\${{${apiKeyAuthName.toUpperCase()}_${
            ConstantString.RegistrationIdPostfix
          }}}`,
        },
      };
    }

    const updatedPart = {
      description: {
        short: spec.info.title.slice(0, ConstantString.ShortDescriptionMaxLens),
        full: (spec.info.description ?? originalManifest.description.full)?.slice(
          0,
          ConstantString.FullDescriptionMaxLens
        ),
      },
      composeExtensions: [ComposeExtension],
    };

    const updatedManifest = { ...originalManifest, ...updatedPart };

    return [updatedManifest, warnings];
  } catch (err) {
    throw new SpecParserError((err as Error).toString(), ErrorType.UpdateManifestFailed);
  }
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
              const [command, warning] = parseApiInfo(operationItem);

              const adaptiveCardPath = path.join(adaptiveCardFolder, command.id + ".json");
              command.apiResponseRenderingTemplateFile = (await fs.pathExists(adaptiveCardPath))
                ? getRelativePath(manifestPath, adaptiveCardPath)
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

export function getRelativePath(from: string, to: string): string {
  const relativePath = path.relative(path.dirname(from), to);
  return path.normalize(relativePath).replace(/\\/g, "/");
}
