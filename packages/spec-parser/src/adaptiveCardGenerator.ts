// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import { Utils } from "./utils";
import {
  AdaptiveCard,
  ArrayElement,
  ErrorType,
  ImageElement,
  TextBlockElement,
} from "./interfaces";
import { ConstantString } from "./constants";
import { SpecParserError } from "./specParserError";

export class AdaptiveCardGenerator {
  static generateAdaptiveCard(
    operationItem: OpenAPIV3.OperationObject,
    allowMultipleMediaType = false,
    maxElementCount: number = Number.MAX_SAFE_INTEGER
  ): [AdaptiveCard, string] {
    try {
      const { json } = Utils.getResponseJson(operationItem, allowMultipleMediaType);

      let cardBody: Array<TextBlockElement | ImageElement | ArrayElement> = [];

      let schema = json.schema as OpenAPIV3.SchemaObject;
      let jsonPath = "$";
      if (schema && Object.keys(schema).length > 0) {
        jsonPath = AdaptiveCardGenerator.getResponseJsonPathFromSchema(schema);
        if (jsonPath !== "$") {
          schema = schema.properties![jsonPath] as OpenAPIV3.SchemaObject;
        }

        cardBody = AdaptiveCardGenerator.generateCardFromResponse(schema, "", "", maxElementCount);
      }

      // if no schema, try to use example value
      if (cardBody.length === 0 && (json.examples || json.example)) {
        cardBody = [
          {
            type: ConstantString.TextBlockType,
            text: "${jsonStringify($root)}",
            wrap: true,
          },
        ];
      }

      // if no example value, use default success response
      if (cardBody.length === 0) {
        cardBody = [
          {
            type: ConstantString.TextBlockType,
            text: "success",
            wrap: true,
          },
        ];
      }

      const fullCard: AdaptiveCard = {
        type: ConstantString.AdaptiveCardType,
        $schema: ConstantString.AdaptiveCardSchema,
        version: ConstantString.AdaptiveCardVersion,
        body: cardBody,
      };

      return [fullCard, jsonPath];
    } catch (err) {
      throw new SpecParserError((err as Error).toString(), ErrorType.GenerateAdaptiveCardFailed);
    }
  }

  static generateCardFromResponse(
    schema: OpenAPIV3.SchemaObject,
    name: string,
    parentArrayName = "",
    maxElementCount = Number.MAX_SAFE_INTEGER,
    counter: { count: number } = { count: 0 }
  ): Array<TextBlockElement | ImageElement | ArrayElement> {
    if (counter.count >= maxElementCount) {
      return [];
    }
    if (schema.type === "array") {
      // schema.items can be arbitrary object: schema { type: array, items: {} }
      if (Object.keys(schema.items).length === 0) {
        counter.count++;
        return [
          {
            type: ConstantString.TextBlockType,
            text: name ? `${name}: \${jsonStringify(${name})}` : "result: ${jsonStringify($root)}",
            wrap: true,
          },
        ];
      }

      const obj = AdaptiveCardGenerator.generateCardFromResponse(
        schema.items as OpenAPIV3.SchemaObject,
        "",
        name,
        maxElementCount,
        counter
      );

      if (obj.length === 0) {
        return [];
      }

      const template = {
        type: ConstantString.ContainerType,
        $data: name ? `\${${name}}` : "${$root}",
        items: Array<TextBlockElement | ImageElement | ArrayElement>(),
      };

      template.items.push(...obj);
      return [template];
    }

    // some schema may not contain type but contain properties
    if (Utils.isObjectSchema(schema)) {
      const { properties } = schema;
      const result: Array<TextBlockElement | ImageElement | ArrayElement> = [];
      for (const property in properties) {
        const obj = AdaptiveCardGenerator.generateCardFromResponse(
          properties[property] as OpenAPIV3.SchemaObject,
          name ? `${name}.${property}` : property,
          parentArrayName,
          maxElementCount,
          counter
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
      counter.count++;
      if (!AdaptiveCardGenerator.isImageUrlProperty(schema, name, parentArrayName)) {
        // string in root: "ddd"
        let text = "result: ${$root}";
        if (name) {
          // object { id: "1" }
          text = `${name}: \${if(${name}, ${name}, 'N/A')}`;
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
            type: ConstantString.TextBlockType,
            text,
            wrap: true,
          },
        ];
      } else {
        const url = name ? `\${${name}}` : "${$data}";
        const condition = name
          ? `\${${name} != null && ${name} != ''}`
          : "${$data != null && $data != ''}";

        return [
          {
            type: "Image",
            url,
            $when: condition,
          },
        ];
      }
    }

    if (schema.oneOf || schema.anyOf || schema.not || schema.allOf) {
      throw new Error(Utils.format(ConstantString.SchemaNotSupported, JSON.stringify(schema)));
    }

    throw new Error(Utils.format(ConstantString.UnknownSchema, JSON.stringify(schema)));
  }

  // Find the first array property in the response schema object with the well-known name
  static getResponseJsonPathFromSchema(schema: OpenAPIV3.SchemaObject): string {
    if (Utils.isObjectSchema(schema)) {
      const { properties } = schema;
      for (const property in properties) {
        const schema = properties[property] as OpenAPIV3.SchemaObject;
        if (
          schema.type === "array" &&
          Utils.isWellKnownName(property, ConstantString.WellknownResultNames)
        ) {
          return property;
        }
      }
    }

    return "$";
  }

  static isImageUrlProperty(
    schema: OpenAPIV3.NonArraySchemaObject,
    name: string,
    parentArrayName: string
  ): boolean {
    const propertyName = name ? name : parentArrayName;
    return (
      !!propertyName &&
      schema.type === "string" &&
      Utils.isWellKnownName(propertyName, ConstantString.WellknownImageName) &&
      (propertyName.toLocaleLowerCase().indexOf("url") >= 0 || schema.format === "uri")
    );
  }
}
