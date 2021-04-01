// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OpenAPI } from "openapi-types";
export enum OpenApiSchemaVersion {
    v2 = "v2",
    v3 = "v3",
}

export interface IOpenApiDocument {
    schemaVersion: OpenApiSchemaVersion;
    spec: OpenAPI.Document;
}
