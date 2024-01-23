// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import { AdaptiveCard, ErrorType } from "./interfaces";
import { SpecParserError } from "./specParserError";
import { ConstantString } from "./constants";
import { generateAdaptiveCard } from "./adaptiveCardGenerator";

export interface Action {
  name: string;
  description: string;
  parameters: OpenAPIV3.NonArraySchemaObject;
}

export interface ActionCode {
  name: string;
  pathUrl: string;
  code: string;
}

export interface Config {
  schema: number;
  description: string;
  type: string;
  completion: Completion;
  augmentation: Augmentation;
}

export interface Completion {
  model: string;
  completion_type: string;
  include_history: boolean;
  include_input: boolean;
  max_input_tokens: number;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
  stop_sequences: any[];
}

export interface Augmentation {
  augmentation_type: string;
}

export interface AdaptiveCardResult {
  name: string;
  pathUrl: string;
  data: AdaptiveCard;
}

const codeTemplate = `
app.ai.action("{{operationId}}", async (context: TurnContext, state: ApplicationTurnState, parameter: any) => {
  const client = await api.getClient();
  const path = await client.paths["{{pathUrl}}"];
  if (path && path.get) {
      const result = await path.get(parameter);
      const card = generateAdaptiveCard("./adaptiveCards/{{operationId}}.json", result);
      await context.sendActivity({ attachments: [card] });
  } else {
      await context.sendActivity("no result");
  }
  return "result";
});`;

export function generateTeamsAiMaterial(
  spec: OpenAPIV3.Document
): [Action[], Config, string, ActionCode[], AdaptiveCardResult[]] {
  try {
    const paths = spec.paths;
    const actions: Action[] = [];
    const actionCodes: ActionCode[] = [];
    const adaptiveCardsResult: AdaptiveCardResult[] = [];
    if (paths) {
      for (const pathUrl in paths) {
        const pathItem = paths[pathUrl];
        if (pathItem) {
          const operations = pathItem;
          for (const method in operations) {
            if (ConstantString.SupportedMethods.includes(method)) {
              const operationItem = (operations as any)[method] as OpenAPIV3.OperationObject;
              if (operationItem) {
                const operationId = operationItem.operationId!;
                const description = operationItem.description ?? "";
                const paramObject = operationItem.parameters as OpenAPIV3.ParameterObject[];

                const [card] = generateAdaptiveCard(operationItem);
                adaptiveCardsResult.push({
                  name: operationItem.operationId!,
                  pathUrl: pathUrl,
                  data: card,
                });

                const parameters: any = {
                  type: "object",
                  properties: {} as OpenAPIV3.SchemaObject,
                  required: [],
                };
                if (paramObject) {
                  for (let i = 0; i < paramObject.length; i++) {
                    const param = paramObject[i];
                    const schema = param.schema as OpenAPIV3.SchemaObject;
                    parameters.properties[param.name] = schema;
                    console.log(param.name);
                    parameters.properties[param.name].description = param.description ?? "";
                    if (param.required) {
                      parameters.required?.push(param.name);
                    }
                  }
                }

                actions.push({
                  name: operationId,
                  description: description,
                  parameters: parameters,
                });

                actionCodes.push({
                  name: operationId,
                  pathUrl: pathUrl,
                  code: codeTemplate
                    .replace(/{{operationId}}/g, operationId)
                    .replace("{{pathUrl}}", pathUrl),
                });
              }
            }
          }
        }
      }
    }

    const configObject: Config = {
      schema: 1.1,
      description: spec.info.description ?? "",
      type: "completion",
      completion: {
        model: "gpt-35-turbo",
        completion_type: "chat",
        include_history: true,
        include_input: true,
        max_input_tokens: 2800,
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.0,
        presence_penalty: 0.6,
        frequency_penalty: 0.0,
        stop_sequences: [],
      },
      augmentation: {
        augmentation_type: "sequence",
      },
    };

    const prompt = `The following is a conversation with an AI assistant.\nThe assistant can help to call APIs for the open api spec file${
      spec.info.description ? ". " + spec.info.description : "."
    }\n\ncontext:\nAvailable actions: {{getAction}}.`;

    return [actions, configObject, prompt, actionCodes, adaptiveCardsResult];
  } catch (err) {
    throw new SpecParserError((err as Error).toString(), ErrorType.UpdateTeamsAiAppFailed);
  }
}
