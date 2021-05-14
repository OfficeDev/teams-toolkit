// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OpenAPI } from "openapi-types";
import { OpenApiSchemaVersion } from "../constants";

export interface IOpenApiDocument {
  schemaVersion: OpenApiSchemaVersion;
  spec: OpenAPI.Document;
}
