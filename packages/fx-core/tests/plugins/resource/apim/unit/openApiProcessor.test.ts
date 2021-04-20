// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import path from "path";
import { OpenApiProcessor } from "../../../../../src/plugins/resource/apim/src/util/openApiProcessor";
import { OpenApiSchemaVersion } from "../../../../../src/plugins/resource/apim/src/model/openApiDocument";
import { InvalidFunctionEndpoint, InvalidOpenApiDocument } from "../../../../../src/plugins/resource/apim/src/error";
chai.use(chaiAsPromised);

describe("OpenApiProcessor", () => {
    describe("#loadOpenApiDocument()", () => {

        const testInput: { message: string; filePath: string; schemaVersion: OpenApiSchemaVersion }[] = [
            {
                message: "v3 json file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/openapi-user.json",
                schemaVersion: OpenApiSchemaVersion.V3,
            },
            {
                message: "v3 yaml file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/openapi-user.yaml",
                schemaVersion: OpenApiSchemaVersion.V3,
            },
            {
                message: "v2 json file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/swagger-user.json",
                schemaVersion: OpenApiSchemaVersion.V2,
            },
            {
                message: "v2 yaml file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/swagger-user.yaml",
                schemaVersion: OpenApiSchemaVersion.V2,
            },
        ];

        testInput.forEach((input) => {
            it(input.message, async () => {
                const openApiProcessor: OpenApiProcessor = new OpenApiProcessor();
                const result = await openApiProcessor.loadOpenApiDocument(input.filePath);
                chai.assert.equal("user input swagger", result.spec.info.title);
                chai.assert.equal("v1", result.spec.info.version);
                switch (input.schemaVersion) {
                    case OpenApiSchemaVersion.V2:
                        chai.assert.equal(OpenApiSchemaVersion.V2, result.schemaVersion);
                        chai.assert.hasAllKeys(result.spec, ["paths", "definitions", "info", "swagger"]);
                        break;
                    case OpenApiSchemaVersion.V3:
                        chai.assert.equal(OpenApiSchemaVersion.V3, result.schemaVersion);
                        chai.assert.hasAllKeys(result.spec, ["paths", "components", "info", "openapi"]);
                        break;
                }
            });
        });

        const errorInput: { message: string; filePath: string; error: string }[] = [
            {
                message: "invalid json file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/invalid.json",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/invalid.json"),
            },
            {
                message: "invalid yaml file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/invalid.yaml",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/invalid.yaml"),
            },
            {
                message: "info undefined",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/info-undefined.json",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/info-undefined.json"),
            },
            {
                message: "not swagger file",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/not-swagger.json",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/not-swagger.json"),
            },
            {
                message: "title empty",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/title-empty.json",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/title-empty.json"),
            },
            {
                message: "title undefined",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/title-undefined.yaml",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/title-undefined.yaml"),
            },
            {
                message: "version empty",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/version-empty.yaml",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/version-empty.yaml"),
            },
            {
                message: "version undefined",
                filePath: "./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/version-undefined.json",
                error: InvalidOpenApiDocument.message("./tests/plugins/resource/apim/unit/data/openApiProcessor/errorSpec/version-undefined.json"),
            },
        ];
        errorInput.forEach((input) => {
            it(input.message, async () => {
                const openApiProcessor: OpenApiProcessor = new OpenApiProcessor();
                await chai.expect(openApiProcessor.loadOpenApiDocument(input.filePath)).to.be.rejectedWith(input.error);
            });
        });
    });

    describe("#generateOpenApiDocument()", () => {
        const testInput: {
            message: string;
            schemaVersion: OpenApiSchemaVersion;
            endpoint: string;
            basePath?: string;
            expectedResult: { [key: string]: any };
        }[] = [
                {
                    message: "v2 https://test-host/",
                    schemaVersion: OpenApiSchemaVersion.V2,
                    endpoint: "https://test-host/",
                    expectedResult: {
                        schemes: ["https"],
                        host: "test-host",
                        basePath: "/api",
                    },
                },
                {
                    message: "v2 http://test-host",
                    schemaVersion: OpenApiSchemaVersion.V2,
                    endpoint: "http://test-host",
                    expectedResult: {
                        schemes: ["http"],
                        host: "test-host",
                        basePath: "/api",
                    },
                },
                {
                    message: "v2 http://test-host with base path '/basepath'",
                    schemaVersion: OpenApiSchemaVersion.V2,
                    endpoint: "http://test-host",
                    basePath: "/basepath",
                    expectedResult: {
                        schemes: ["http"],
                        host: "test-host",
                        basePath: "/basepath",
                    },
                },
                {
                    message: "v2 http://test-host with base path 'basepath'",
                    schemaVersion: OpenApiSchemaVersion.V2,
                    endpoint: "http://test-host",
                    basePath: "basepath",
                    expectedResult: {
                        schemes: ["http"],
                        host: "test-host",
                        basePath: "/basepath",
                    },
                },
                {
                    message: "v3 https://test-host",
                    schemaVersion: OpenApiSchemaVersion.V3,
                    endpoint: "https://test-host",
                    expectedResult: { servers: [{ url: "https://test-host/api" }] },
                },
                {
                    message: "v3 https://test-host/",
                    schemaVersion: OpenApiSchemaVersion.V3,
                    endpoint: "https://test-host/",
                    expectedResult: { servers: [{ url: "https://test-host/api" }] },
                },
                {
                    message: "v3 https://test-host/ with base path '/basepath'",
                    schemaVersion: OpenApiSchemaVersion.V3,
                    endpoint: "https://test-host/",
                    basePath: "/basepath",
                    expectedResult: { servers: [{ url: "https://test-host/basepath" }] },
                },
                {
                    message: "v3 https://test-host/ with base path 'basepath'",
                    schemaVersion: OpenApiSchemaVersion.V3,
                    endpoint: "https://test-host/",
                    basePath: "basepath",
                    expectedResult: { servers: [{ url: "https://test-host/basepath" }] },
                },
            ];

        testInput.forEach((input) => {
            it(`[valid endpoint] ${input.message}`, async () => {
                const openApiProcessor: OpenApiProcessor = new OpenApiProcessor();
                const openApiFile =
                    input.schemaVersion == OpenApiSchemaVersion.V2
                        ? "./tests/plugins/resource/apim/unit/data/openApiProcessor/swagger-user.json"
                        : "./tests/plugins/resource/apim/unit/data/openApiProcessor/openapi-user.json";
                const openApiDocument = await openApiProcessor.loadOpenApiDocument(openApiFile);
                const spec = openApiProcessor.patchOpenApiDocument(
                    openApiDocument.spec,
                    openApiDocument.schemaVersion,
                    input.endpoint,
                    input.basePath
                );
                for (const expectedKey in input.expectedResult) {
                    chai.assert.deepEqual((spec as any)[expectedKey], input.expectedResult[expectedKey]);
                }
            });
        });

        const invalidInput: {
            message: string;
            schemaVersion: OpenApiSchemaVersion;
            endpoint: string;
            error: string;
        }[] = [
                {
                    message: "v2 test-host",
                    schemaVersion: OpenApiSchemaVersion.V2,
                    endpoint: "test-host",
                    error: InvalidFunctionEndpoint.message(),
                },
                {
                    message: "v3 test-host",
                    schemaVersion: OpenApiSchemaVersion.V3,
                    endpoint: "test-host",
                    error: InvalidFunctionEndpoint.message(),
                },
                {
                    message: "v2 ftp://test-host",
                    schemaVersion: OpenApiSchemaVersion.V2,
                    endpoint: "ftp://test-host",
                    error: InvalidFunctionEndpoint.message(),
                },
                {
                    message: "v3 ftp://test-host",
                    schemaVersion: OpenApiSchemaVersion.V3,
                    endpoint: "ftp://test-host",
                    error: InvalidFunctionEndpoint.message(),
                },
            ];

        invalidInput.forEach((input) => {
            it(`[invalid endpoint] ${input.message}`, async () => {
                const openApiProcessor: OpenApiProcessor = new OpenApiProcessor();
                const openApiFile =
                    input.schemaVersion == OpenApiSchemaVersion.V2
                        ? "./tests/plugins/resource/apim/unit/data/openApiProcessor/swagger-user.json"
                        : "./tests/plugins/resource/apim/unit/data/openApiProcessor/openapi-user.json";
                const openApiDocument = await openApiProcessor.loadOpenApiDocument(openApiFile);
                chai.expect(() => openApiProcessor.patchOpenApiDocument(openApiDocument.spec, openApiDocument.schemaVersion, input.endpoint)).Throw(
                    input.error
                );
            });
        });
    });

    describe("#loadOpenApiDocument()", () => {
        it("Load valid swagger files", async () => {
            const openApiProcessor: OpenApiProcessor = new OpenApiProcessor();
            const result = await openApiProcessor.listOpenApiDocument(
                "./tests/plugins/resource/apim/unit/data/openApiProcessor/loadOpenApiDocument",
                ["exclude"],
                ["json", "yaml"]
            );

            chai.assert.deepEqual(
                [...result.keys()].sort(),
                ["openapi.json", "include/openapi.yaml", "include/swagger.json", "swagger.yaml"].sort()
            );
        });
    });

    describe("#listAllFiles()", () => {
        let openApiProcessor: OpenApiProcessor;
        before(async () => {
            openApiProcessor = new OpenApiProcessor();
        });

        const testInput: {
            message: string;
            excludeFolders?: string[];
            fileExtensions?: string[];
            output: string[];
        }[] = [
                {
                    message: "list all the files under folder",
                    output: ["a/a1.json", "a/a2.txt", "a/a3", "a/a4.yaml", "b/b1.json", "b/b2.txt", "b/b3", "b/b4.yaml"],
                },
                {
                    message: "list the files not in folder 'a'",
                    excludeFolders: ["a"],
                    output: ["b/b1.json", "b/b2.txt", "b/b3", "b/b4.yaml"],
                },
                {
                    message: "list the files not in folder 'a' & 'b'",
                    excludeFolders: ["a", "b"],
                    output: [],
                },
                {
                    message: "list all the json files",
                    fileExtensions: ["json"],
                    output: ["a/a1.json", "b/b1.json"],
                },
                {
                    message: "list all the json & yaml files",
                    fileExtensions: ["json", "yaml"],
                    output: ["a/a1.json", "b/b1.json", "a/a4.yaml", "b/b4.yaml"],
                },
                {
                    message: "list all the json & yaml files exclude folder 'a'",
                    excludeFolders: ["a"],
                    fileExtensions: ["json", "yaml"],
                    output: ["b/b1.json", "b/b4.yaml"],
                },
            ];
        testInput.forEach((data) => {
            it(data.message, async () => {
                const result = await openApiProcessor.listAllFiles(
                    "./tests/plugins/resource/apim/unit/data/openApiProcessor/listAllFiles",
                    data.excludeFolders ?? [],
                    data.fileExtensions
                );
                chai.assert.deepEqual(
                    result.sort(),
                    data.output.map((file) => path.normalize(`./tests/plugins/resource/apim/unit/data/openApiProcessor/listAllFiles/${file}`)).sort()
                );
            });
        });
    });
});
