// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import * as util from "util";
import { getResponseJson } from "./utils";
import { AdaptiveCard, ArrayElement, TextBlockElement } from "./interfaces";
import { ConstantString } from "./constants";

export function generateAdaptiveCard(operationItem: OpenAPIV3.OperationObject): AdaptiveCard {
  const json = getResponseJson(operationItem);

  let cardBody: Array<TextBlockElement | ArrayElement> = [];
  if (json.schema) {
    cardBody = generateCardFromResponse(json.schema as OpenAPIV3.SchemaObject, "");
  }

  // if no schema, try to use example value
  if (cardBody.length === 0 && (json.examples || json.example)) {
    cardBody = [
      {
        type: "TextBlock",
        text: "${jsonStringify($root)}",
        wrap: true,
      },
    ];
  }

  // if no example value, use default success response
  if (cardBody.length === 0) {
    cardBody = [
      {
        type: "TextBlock",
        text: "success",
        wrap: true,
      },
    ];
  }

  const fullCard: AdaptiveCard = {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: cardBody,
  };

  return fullCard;
}

export function generateCardFromResponse(
  schema: OpenAPIV3.SchemaObject,
  name: string,
  parentArrayName = ""
): Array<TextBlockElement | ArrayElement> {
  if (schema.type === "array") {
    // schema.items can be arbitrary object: schema { type: array, items: {} }
    if (Object.keys(schema.items).length === 0) {
      return [
        {
          type: "TextBlock",
          text: name ? `${name}: \${jsonStringify(${name})}` : "result: ${jsonStringify($root)}",
          wrap: true,
        },
      ];
    }

    const obj = generateCardFromResponse(schema.items as OpenAPIV3.SchemaObject, "", name);
    const template = {
      type: "Container",
      $data: name ? `\${${name}}` : "${$root}",
      items: Array<TextBlockElement | ArrayElement>(),
    };

    template.items.push(...obj);
    return [template];
  }
  // some schema may not contain type but contain properties
  if (schema.type === "object" || (!schema.type && schema.properties)) {
    const { properties } = schema;
    const result: Array<TextBlockElement | ArrayElement> = [];
    for (const property in properties) {
      const obj = generateCardFromResponse(
        properties[property] as OpenAPIV3.SchemaObject,
        name ? `${name}.${property}` : property,
        parentArrayName
      );
      result.push(...obj);
    }

    if (schema.additionalProperties) {
      // TODO: better ways to handler warnings.
      console.warn(ConstantString.AdditionalPropertiesNotSupported);
    }

    return result;
  }
  if (
    schema.type === "string" ||
    schema.type === "integer" ||
    schema.type === "boolean" ||
    schema.type === "number"
  ) {
    // string in root: "ddd"
    let text = "result: ${$root}";
    if (name) {
      // object { id: "1" }
      text = `${name}: \${${name}}`;
      if (parentArrayName) {
        // object types inside array: { tags: ["id": 1, "name": "name"] }
        text = `${parentArrayName}.${text}`;
      }
    } else if (parentArrayName) {
      // string array: photoUrls: ["1", "2"]
      text = `${parentArrayName}: ` + "${$data}";
    }

    return [
      {
        type: "TextBlock",
        text,
        wrap: true,
      },
    ];
  }

  // TODO: better ways to handler errors.
  if (schema.oneOf || schema.anyOf || schema.not || schema.allOf) {
    throw new Error(util.format(ConstantString.SchemaNotSupported, JSON.stringify(schema)));
  }

  throw new Error(util.format(ConstantString, JSON.stringify(schema)));
}
