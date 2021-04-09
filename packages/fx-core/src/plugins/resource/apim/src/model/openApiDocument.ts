// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OpenAPI } from "openapi-types";
export enum OpenApiSchemaVersion {
    V2 = "v2",
    V3 = "v3",
}

export interface IOpenApiDocument {
    schemaVersion: OpenApiSchemaVersion;
    spec: OpenAPI.Document;
}
