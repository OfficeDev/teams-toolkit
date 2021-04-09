// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import SwaggerParser from "@apidevtools/swagger-parser";
import { BuildError, InvalidFunctionEndpoint, InvalidOpenApiDocument } from "../error";
import { OpenApiSchemaVersion, IOpenApiDocument } from "../model/openApiDocument";
import urlParse from "url-parse";
import * as fs from "fs-extra";
import * as path from "path";
import { ApimDefaultValues } from "../constants";
import { Telemetry } from "../telemetry";
import { LogProvider } from "fx-api";
import { getFileExtension } from "../util";
import { LogMessages } from "../log";
import { OpenAPI, OpenAPIV2, OpenAPIV3 } from "openapi-types";

export class OpenApiProcessor {
    private readonly logger?: LogProvider;
    private readonly telemetry: Telemetry;
    private readonly swaggerParser: SwaggerParser;

    constructor(telemetry: Telemetry, logger?: LogProvider) {
        this.logger = logger;
        this.telemetry = telemetry;
        this.swaggerParser = new SwaggerParser();
    }

    public async generateDefaultOpenApi(fileName: string, title: string, version: string): Promise<void> {
        const exists = fs.existsSync(fileName);
        if (exists) {
            this.logger?.info(LogMessages.openApiDocumentExists(fileName));
            return;
        }

        const spec = {
            openapi: "3.0.1",
            info: {
                title: title,
                version: version,
            },
            paths: {},
        };

        await fs.outputJSON(fileName, spec, { spaces: 4 });
    }

    public async listOpenApiDocument(
        dir: string,
        excludeFolders: string[],
        openApiDocumentFileExtensions: string[]
    ): Promise<Map<string, IOpenApiDocument>> {
        const files = await this.listAllFiles(dir, excludeFolders, openApiDocumentFileExtensions);
        const fileName2OpenApi = new Map<string, IOpenApiDocument>();
        for (const file of files) {
            try {
                const openApi = await this.loadOpenApiDocument(file);
                const relativePath = path.relative(dir, file).replace("\\", "/");
                fileName2OpenApi.set(relativePath, openApi);
            } catch (error) {
                continue;
            }
        }

        return fileName2OpenApi;
    }

    public async loadOpenApiDocument(fileName: string, dir?: string): Promise<IOpenApiDocument> {
        let srcSpec: OpenAPI.Document;
        const filepath = !dir ? fileName : path.join(dir, fileName);
        try {
            srcSpec = await this.swaggerParser.parse(filepath, {
                parse: { json: { allowEmpty: false }, yaml: { allowEmpty: false } },
            });
        } catch (error) {
            throw BuildError(InvalidOpenApiDocument, filepath);
        }

        const schemaVersion = this.getSchemaVersion(srcSpec, filepath);
        this.telemetry.sendOpenApiDocumentEvent(getFileExtension(filepath), schemaVersion);
        return {
            schemaVersion: schemaVersion,
            spec: srcSpec,
        };
    }

    public patchOpenApiDocument(spec: OpenAPI.Document, schemaVersion: OpenApiSchemaVersion, endpoint: string, basePath?: string): OpenAPI.Document {
        const parsedUrl = urlParse(endpoint);
        basePath = basePath ?? ApimDefaultValues.functionBasePath;
        parsedUrl.set("pathname", basePath);
        const scheme = this.getScheme(parsedUrl.protocol);
        switch (schemaVersion) {
            case OpenApiSchemaVersion.V2:
                spec = spec as OpenAPIV2.Document;
                spec.schemes = [scheme];
                spec.host = parsedUrl.hostname;
                spec.basePath = parsedUrl.pathname;
                break;
            case OpenApiSchemaVersion.V3:
                spec = spec as OpenAPIV3.Document;
                spec.servers = [{ url: parsedUrl.toString() }];
                break;
        }
        return spec;
    }

    public async listAllFiles(dir: string, excludeFolders: string[], fileExtensions?: string[]): Promise<string[]> {
        const result: string[] = [];
        const files = await fs.readdir(dir);
        for (const fileName of files) {
            try {
                const filePath = path.join(dir, fileName);
                if ((await fs.stat(filePath)).isDirectory()) {
                    if (excludeFolders.includes(fileName)) {
                        continue;
                    }

                    result.push(...(await this.listAllFiles(filePath, excludeFolders, fileExtensions)));
                } else {
                    if (!fileExtensions) {
                        result.push(filePath);
                        continue;
                    }

                    for (const fileExtension of fileExtensions) {
                        if (filePath.endsWith(`.${fileExtension}`)) {
                            result.push(filePath);
                            break;
                        }
                    }
                }
            } catch (error) {
                this.logger?.warning(LogMessages.accessFileFailed(dir, fileName));
                continue;
            }
        }
        return result;
    }

    private getSchemaVersion(spec: OpenAPI.Document, filePath: string): OpenApiSchemaVersion {
        if ("swagger" in spec) {
            return OpenApiSchemaVersion.V2;
        } else if ("openapi" in spec) {
            return OpenApiSchemaVersion.V3;
        } else {
            throw BuildError(InvalidOpenApiDocument, filePath);
        }
    }

    private getScheme(protocol: string): string {
        if (protocol.startsWith("https")) {
            return "https";
        } else if (protocol.startsWith("http")) {
            return "http";
        } else {
            throw BuildError(InvalidFunctionEndpoint);
        }
    }
}
