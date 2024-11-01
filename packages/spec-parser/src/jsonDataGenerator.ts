// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";

export class JsonDataGenerator {
  private static visitedSchemas = new Set<OpenAPIV3.SchemaObject>();

  static generate(schema: OpenAPIV3.SchemaObject): any {
    return this.generateMockData(schema);
  }

  static generateMockData(schema: OpenAPIV3.SchemaObject): any {
    if (this.visitedSchemas.has(schema)) {
      return null; // Prevent circular reference
    }
    this.visitedSchemas.add(schema);

    let result: any;
    if (schema.anyOf) {
      // Select the first schema in anyOf
      const selectedSchema = schema.anyOf[0] as OpenAPIV3.SchemaObject;
      result = this.generateMockData(selectedSchema);
    } else if (schema.oneOf) {
      // Select the first schema in oneOf
      const selectedSchema = schema.oneOf[0] as OpenAPIV3.SchemaObject;
      result = this.generateMockData(selectedSchema);
    } else if (schema.allOf) {
      // merge all schemas in allOf
      result = {};
      for (const subschema of schema.allOf) {
        const data = this.generateMockData(subschema as OpenAPIV3.SchemaObject);
        result = { ...result, ...data };
      }
    } else {
      switch (schema.type) {
        case "string":
          if (schema.example !== undefined) {
            result = schema.example;
          } else if (schema.format) {
            switch (schema.format) {
              case "date-time":
                result = "2024-11-01T05:25:43.593Z";
                break;
              case "email":
                result = "example@example.com";
                break;
              case "uuid":
                result = "123e4567-e89b-12d3-a456-426614174000";
                break;
              case "ipv4":
                result = "192.168.0.1";
                break;
              case "ipv6":
                result = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
                break;
              default:
                result = "example string";
            }
          } else {
            result = "example string";
          }
          break;
        case "number":
          if (schema.example !== undefined) {
            result = schema.example;
          } else if (schema.format) {
            switch (schema.format) {
              case "float":
                result = 3.14;
                break;
              case "double":
                result = 3.14159;
                break;
              default:
                result = 123;
            }
          } else {
            result = 123;
          }
          break;
        case "integer":
          if (schema.example !== undefined) {
            result = schema.example;
          } else if (schema.format) {
            switch (schema.format) {
              case "int32":
                result = 123456;
                break;
              case "int64":
                result = 123456789;
                break;
              default:
                result = 123;
            }
          } else {
            result = 123;
          }
          break;
        case "boolean":
          result = schema.example !== undefined ? schema.example : true;
          break;
        case "array":
          result = [this.generateMockData(schema.items as OpenAPIV3.SchemaObject)];
          break;
        case "object":
          result = {};
          if (schema.properties) {
            for (const key in schema.properties) {
              result[key] = this.generateMockData(schema.properties[key] as OpenAPIV3.SchemaObject);
            }
          }
          break;
        default:
          result = schema.example || null;
      }
    }

    this.visitedSchemas.delete(schema);
    return result;
  }
}
