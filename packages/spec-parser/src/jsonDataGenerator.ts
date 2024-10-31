// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OpenAPIV3 } from "openapi-types";
import { JSONSchemaFaker } from "json-schema-faker";

export class JsonDataGenerator {
  static async generate(schema: OpenAPIV3.SchemaObject): Promise<any> {
    try {
      const asyncValue = await JSONSchemaFaker.resolve(schema);
      return asyncValue;
    } catch (err) {
      return undefined;
    }
  }
}
