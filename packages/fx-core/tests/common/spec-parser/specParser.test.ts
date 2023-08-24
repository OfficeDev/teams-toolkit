// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as util from "util";
import fs from "fs-extra";
import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { SpecParser } from "../../../src/common/spec-parser/specParser";
import {
  ErrorType,
  ValidationStatus,
  WarningType,
} from "../../../src/common/spec-parser/interfaces";
import SwaggerParser from "@apidevtools/swagger-parser";
import { SpecParserError } from "../../../src/common/spec-parser/specParserError";
import { ConstantString } from "../../../src/common/spec-parser/constants";
import { OpenAPIV3 } from "openapi-types";
import * as SpecFilter from "../../../src/common/spec-parser/specFilter";
import * as ManifestUpdater from "../../../src/common/spec-parser/manifestUpdater";
import * as AdaptiveCardGenerator from "../../../src/common/spec-parser/adaptiveCardGenerator";
import jsyaml from "js-yaml";

describe("SpecParser", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("validate", () => {
    it("should return an error result when the spec is not valid", async () => {
      const specParser = new SpecParser("/path/to/spec.yaml");
      const parseStub = sinon.stub(specParser.parser, "parse").rejects(new Error("Invalid spec"));

      const result = await specParser.validate();

      expect(result.status).to.equal(ValidationStatus.Error);
      expect(result.warnings).to.be.an("array").that.is.empty;
      expect(result.errors).to.be.an("array").that.has.lengthOf(1);
      expect(result.errors[0].type).to.equal(ErrorType.SpecNotValid);
      expect(result.errors[0].content).to.equal("Error: Invalid spec");
      sinon.assert.calledOnce(parseStub);
    });

    it("should return an error result object if the spec version is not supported", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "2.0.0" };
      const specParser = new SpecParser(specPath);

      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);

      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          {
            type: ErrorType.VersionNotSupported,
            content: ConstantString.SpecVersionNotSupported,
            data: "2.0.0",
          },
        ],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return an error result object if no server information", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0" };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          { type: ErrorType.NoServerInformation, content: ConstantString.NoServerInformation },
          { type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi },
        ],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return an error result object if has multiple server information", async function () {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.0",
        servers: [{ url: "https://server1" }, { url: "https://server2" }],
      };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          {
            type: ErrorType.MultipleServerInformation,
            content: ConstantString.MultipleServerInformation,
            data: [{ url: "https://server1" }, { url: "https://server2" }],
          },
          { type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi },
        ],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return an error result object if server url is http", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0", servers: [{ url: "http://server1" }] };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          {
            type: ErrorType.UrlProtocolNotSupported,
            content: util.format(ConstantString.UrlProtocolNotSupported, "http:"),
            data: [{ url: "http://server1" }],
          },
          { type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi },
        ],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return an error result object if server url is relative path", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0", servers: [{ url: "path/to/server1" }] };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          {
            type: ErrorType.RelativeServerUrlNotSupported,
            content: ConstantString.RelativeServerUrlNotSupported,
            data: [{ url: "path/to/server1" }],
          },
          { type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi },
        ],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return an error result object if no supported apis", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0", servers: [{ url: "https://server1" }] };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [{ type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi }],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return an error result object if contain remote reference", async function () {
      const spec = {
        openapi: "3.0.3",
        info: {
          title: "Swagger Petstore - OpenAPI 3.",
          version: "1.0.11",
        },
        servers: [
          {
            url: "https://petstore3.swagger.io/api/v3",
          },
        ],
        paths: {
          "/pet": {
            get: {
              tags: ["pet"],
              operationId: "updatePet",
              responses: {
                "200": {
                  description: "Successful operation",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "https://petstore3.swagger.io/api/v3/openapi.json#/components/schemas/Pet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  example: "doggie",
                },
              },
            },
          },
        },
      } as OpenAPIV3.Document;
      const specPath = "path/to/spec";
      const specParser = new SpecParser(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result.errors[0].type).equal(ErrorType.RemoteRefNotSupported);
      expect(result.status).equal(ValidationStatus.Error);
    });

    it("should return an warning result object if missing operation id", async function () {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.2",
        servers: [
          {
            url: "https://servers1",
          },
        ],
        paths: {
          "/pet": {
            get: {
              tags: ["pet"],
              summary: "Get pet information from the store",
              parameters: [
                {
                  name: "tags",
                  in: "query",
                  description: "Tags to filter by",
                  schema: {
                    type: "string",
                  },
                },
              ],
              responses: {
                "200": {
                  content: {
                    "application/xml": {
                      schema: {
                        $ref: "#/components/schemas/Pet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Warning,
        warnings: [
          {
            type: WarningType.OperationIdMissing,
            content: util.format(ConstantString.MissingOperationId, "GET /pet"),
            data: ["GET /pet"],
          },
        ],
        errors: [],
      });
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should return a valid result when the spec is valid", async () => {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.2",
        servers: [
          {
            url: "https://server1",
          },
        ],
        paths: {
          "/pet": {
            get: {
              tags: ["pet"],
              operationId: "getPet",
              summary: "Get pet information from the store",
              parameters: [
                {
                  name: "tags",
                  in: "query",
                  description: "Tags to filter by",
                  schema: {
                    type: "string",
                  },
                },
              ],
              responses: {
                "200": {
                  content: {
                    "application/xml": {
                      schema: {
                        $ref: "#/components/schemas/Pet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const specParser = new SpecParser(specPath);
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
      const result = await specParser.validate();
      expect(result.status).to.equal(ValidationStatus.Valid);
      expect(result.warnings).to.be.an("array").that.is.empty;
      expect(result.errors).to.be.an("array").that.is.empty;
      sinon.assert.calledOnce(dereferenceStub);
    });

    it("should throw a SpecParserError when an error occurs", async () => {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.2",
        servers: [
          {
            url: "https://server1",
          },
        ],
        paths: {
          "/pet": {
            get: {
              tags: ["pet"],
              operationId: "getPet",
              summary: "Get pet information from the store",
              parameters: [
                {
                  name: "tags",
                  in: "query",
                  description: "Tags to filter by",
                  schema: {
                    type: "string",
                  },
                },
              ],
              responses: {
                "200": {
                  content: {
                    "application/xml": {
                      schema: {
                        $ref: "#/components/schemas/Pet",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      try {
        const specParser = new SpecParser(specPath);
        const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
        const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
        const validateStub = sinon.stub(specParser.parser, "validate").resolves(spec as any);
        sinon
          .stub(specParser as any, "getAllSupportedApi")
          .throws(new Error("getAllSupportedApi error"));

        const result = await specParser.validate();
        expect.fail("Expected SpecParserError to be thrown");
      } catch (err) {
        expect(err).to.be.instanceOf(SpecParserError);
        expect(err.errorType).to.equal(ErrorType.ValidateFailed);
        expect(err.message).to.equal("Error: getAllSupportedApi error");
      }
    });
  });

  describe("generate", () => {
    it("should throw an error if the signal is aborted", async () => {
      const manifestPath = "path/to/manifest";
      const filter = ["GET /pet/{petId}"];
      const specPath = "path/to/spec";
      const adaptiveCardFolder = "path/to/adaptiveCardFolder";
      const signal = { aborted: true } as AbortSignal;
      const parser = new SpecParser("/path/to/spec.yaml");

      try {
        await parser.generate(manifestPath, filter, specPath, adaptiveCardFolder, signal);
        expect.fail("Expected an error to be thrown");
      } catch (err) {
        expect((err as SpecParserError).message).contain(ConstantString.CancelledMessage);
        expect((err as SpecParserError).errorType).to.equal(ErrorType.Cancelled);
      }
    });

    it("should throw an error if the signal is aborted after loadSpec", async () => {
      const manifestPath = "path/to/manifest";
      const filter = ["GET /pet/{petId}"];
      const specPath = "path/to/spec";
      const adaptiveCardFolder = "path/to/adaptiveCardFolder";
      try {
        const signal = { aborted: false } as any;

        const specParser = new SpecParser("path/to/spec.yaml");
        const spec = { openapi: "3.0.0", paths: {} };

        const parseStub = sinon.stub(specParser as any, "loadSpec").callsFake(async () => {
          signal.aborted = true;
          return Promise.resolve();
        });
        const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
        await specParser.generate(manifestPath, filter, specPath, adaptiveCardFolder, signal);
        expect.fail("Expected an error to be thrown");
      } catch (err) {
        expect((err as SpecParserError).message).contain(ConstantString.CancelledMessage);
        expect((err as SpecParserError).errorType).to.equal(ErrorType.Cancelled);
      }
    });

    it("should throw an error if the signal is aborted after specFilter", async () => {
      try {
        const signal = { aborted: false } as any;

        const specParser = new SpecParser("path/to/spec.yaml");
        const spec = { openapi: "3.0.0", paths: {} };
        const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
        const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
        const specFilterStub = sinon
          .stub(SpecFilter, "specFilter")
          .callsFake((filter: string[], unResolveSpec: any) => {
            signal.aborted = true;
            return {} as any;
          });
        const outputFileStub = sinon.stub(fs, "outputFile").resolves();
        const outputJSONStub = sinon.stub(fs, "outputJSON").resolves();
        const JsyamlSpy = sinon.spy(jsyaml, "dump");

        const filter = ["get /hello"];

        const outputSpecPath = "path/to/output.yaml";
        await specParser.generate(
          "path/to/manifest.json",
          filter,
          outputSpecPath,
          "path/to/adaptiveCardFolder",
          signal
        );
        expect.fail("Expected an error to be thrown");
      } catch (err) {
        expect((err as SpecParserError).message).contain(ConstantString.CancelledMessage);
        expect((err as SpecParserError).errorType).to.equal(ErrorType.Cancelled);
      }
    });

    it("should throw an error if the signal is aborted after updateManifest", async () => {
      try {
        const specParser = new SpecParser("path/to/spec.yaml");
        const spec = { openapi: "3.0.0", paths: {} };
        const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
        const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
        const specFilterStub = sinon.stub(SpecFilter, "specFilter").returns({} as any);
        const outputFileStub = sinon.stub(fs, "outputFile").resolves();
        const outputJSONStub = sinon.stub(fs, "outputJSON").resolves();
        const JsyamlSpy = sinon.spy(jsyaml, "dump");
        const signal = { aborted: false } as any;

        const manifestUpdaterStub = sinon
          .stub(ManifestUpdater, "updateManifest")
          .callsFake(
            (
              manifestPath: string,
              outputSpecPath: string,
              adaptiveCardFolder: string,
              spec: OpenAPIV3.Document
            ) => {
              signal.aborted = true;
              return {} as any;
            }
          );
        const generateAdaptiveCardStub = sinon
          .stub(AdaptiveCardGenerator, "generateAdaptiveCard")
          .returns({} as any);

        const filter = ["get /hello"];

        const outputSpecPath = "path/to/output.yaml";
        await specParser.generate(
          "path/to/manifest.json",
          filter,
          outputSpecPath,
          "path/to/adaptiveCardFolder",
          signal
        );
      } catch (err) {
        expect((err as SpecParserError).message).contain(ConstantString.CancelledMessage);
        expect((err as SpecParserError).errorType).to.equal(ErrorType.Cancelled);
      }
    });

    it("should generate a new spec and write it to a yaml file", async () => {
      const specParser = new SpecParser("path/to/spec.yaml");
      const spec = { openapi: "3.0.0", paths: {} };
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const specFilterStub = sinon.stub(SpecFilter, "specFilter").returns({} as any);
      const outputFileStub = sinon.stub(fs, "outputFile").resolves();
      const outputJSONStub = sinon.stub(fs, "outputJSON").resolves();
      const JsyamlSpy = sinon.spy(jsyaml, "dump");

      const manifestUpdaterStub = sinon.stub(ManifestUpdater, "updateManifest").resolves();
      const generateAdaptiveCardStub = sinon
        .stub(AdaptiveCardGenerator, "generateAdaptiveCard")
        .returns({} as any);

      const filter = ["get /hello"];

      const outputSpecPath = "path/to/output.yaml";
      await specParser.generate(
        "path/to/manifest.json",
        filter,
        outputSpecPath,
        "path/to/adaptiveCardFolder"
      );

      expect(JsyamlSpy.calledOnce).to.be.true;
      expect(specFilterStub.calledOnce).to.be.true;
      expect(outputFileStub.calledOnce).to.be.true;
      expect(manifestUpdaterStub.calledOnce).to.be.true;
      expect(outputFileStub.firstCall.args[0]).to.equal(outputSpecPath);
    });

    it("should throw a SpecParserError if outputFile throws an error", async () => {
      const specParser = new SpecParser("path/to/spec.yaml");
      const spec = { openapi: "3.0.0", paths: {} };
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const specFilterStub = sinon.stub(SpecFilter, "specFilter").resolves();
      const outputFileStub = sinon.stub(fs, "outputFile").throws(new Error("outputFile error"));
      const outputJSONStub = sinon.stub(fs, "outputJSON").resolves();
      const JSONStringifySpy = sinon.spy(JSON, "stringify");
      const JsyamlSpy = sinon.spy(jsyaml, "dump");
      const manifestUpdaterStub = sinon.stub(ManifestUpdater, "updateManifest").resolves();
      const generateAdaptiveCardStub = sinon
        .stub(AdaptiveCardGenerator, "generateAdaptiveCard")
        .returns({} as any);

      const filter = ["get /hello"];

      const outputSpecPath = "path/to/output.json";

      try {
        await specParser.generate(
          "path/to/manifest.json",
          filter,
          outputSpecPath,
          "path/to/adaptiveCardFolder"
        );
        expect.fail("Expected generate to throw a SpecParserError");
      } catch (err) {
        expect(err).to.be.instanceOf(SpecParserError);
        expect(err.errorType).to.equal(ErrorType.GenerateFailed);
        expect(err.message).to.equal("Error: outputFile error");
      }
    });

    it("should throw a SpecParserError if specFilter throws a SpecParserError", async () => {
      const specParser = new SpecParser("path/to/spec.yaml");
      const spec = { openapi: "3.0.0", paths: {} };
      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);
      const specFilterStub = sinon
        .stub(SpecFilter, "specFilter")
        .throws(new SpecParserError("specFilter error", ErrorType.FilterSpecFailed));
      const outputFileStub = sinon.stub(fs, "outputFile").resolves();
      const outputJSONStub = sinon.stub(fs, "outputJSON").resolves();
      const JSONStringifySpy = sinon.spy(JSON, "stringify");
      const JsyamlSpy = sinon.spy(jsyaml, "dump");
      const manifestUpdaterStub = sinon.stub(ManifestUpdater, "updateManifest").resolves();
      const generateAdaptiveCardStub = sinon
        .stub(AdaptiveCardGenerator, "generateAdaptiveCard")
        .returns({} as any);

      const filter = ["get /hello"];

      const outputSpecPath = "path/to/output.json";

      try {
        await specParser.generate(
          "path/to/manifest.json",
          filter,
          outputSpecPath,
          "path/to/adaptiveCardFolder"
        );
        expect.fail("Expected generate to throw a SpecParserError");
      } catch (err) {
        expect(err).to.be.instanceOf(SpecParserError);
        expect(err.errorType).to.equal(ErrorType.FilterSpecFailed);
        expect(err.message).to.equal("specFilter error");
      }
    });
  });

  describe("listOperationMap", () => {
    it("should return a map of operation IDs to paths", async () => {
      const specPath = "valid-spec.yaml";
      const specParser = new SpecParser(specPath);
      const spec = {
        paths: {
          "/pets": {
            get: {
              operationId: "getPetById",
              security: [{ api_key: [] }],
            },
          },
          "/user/{userId}": {
            get: {
              operationId: "getUserById",
              parameters: [
                {
                  name: "userId",
                  in: "path",
                  schema: {
                    type: "string",
                  },
                },
              ],
            },
            post: {
              operationId: "createUser",
              security: [{ api_key: [] }],
            },
          },
          "/store/order": {
            get: {
              parameters: [
                {
                  name: "orderId",
                  in: "query",
                  schema: {
                    type: "string",
                  },
                },
              ],
            },
            post: {
              operationId: "placeOrder",
            },
          },
        },
      };

      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);

      const expected = new Map<string, string>([
        ["getUserById", "GET /user/{userId}"],
        ["getStoreOrder", "GET /store/order"],
      ]);
      const result = await specParser.listOperationMap();
      expect(result).to.deep.equal(expected);
    });

    it("should throw an error if loading the spec fails", async () => {
      const specPath = "valid-spec.yaml";
      const specParser = new SpecParser(specPath);
      const expectedError = new SpecParserError(
        "Failed to load spec",
        ErrorType.ListOperationMapFailed
      );

      sinon.stub(specParser as any, "loadSpec").rejects(expectedError);
      try {
        await specParser.listOperationMap();
        expect.fail("Expected an error to be thrown");
      } catch (err) {
        expect((err as SpecParserError).message).contain("Failed to load spec");
        expect((err as SpecParserError).errorType).to.equal(ErrorType.ListOperationMapFailed);
      }
    });
  });

  describe("list", () => {
    it("should return a list of HTTP methods and paths for all GET with 1 parameter and without security", async () => {
      const specPath = "valid-spec.yaml";
      const specParser = new SpecParser(specPath);
      const spec = {
        paths: {
          "/pets": {
            get: {
              operationId: "getPetById",
              security: [{ api_key: [] }],
            },
          },
          "/user/{userId}": {
            get: {
              operationId: "getUserById",
              parameters: [
                {
                  name: "userId",
                  in: "path",
                  schema: {
                    type: "string",
                  },
                },
              ],
            },
            post: {
              operationId: "createUser",
              security: [{ api_key: [] }],
            },
          },
          "/store/order": {
            post: {
              operationId: "placeOrder",
            },
          },
        },
      };

      const parseStub = sinon.stub(specParser.parser, "parse").resolves(spec as any);
      const dereferenceStub = sinon.stub(specParser.parser, "dereference").resolves(spec as any);

      const result = await specParser.list();

      expect(result).to.deep.equal(["GET /user/{userId}"]);
    });

    it("should throw an error when the SwaggerParser library throws an error", async () => {
      const specPath = "invalid-spec.yaml";
      const specParser = new SpecParser(specPath);
      sinon.stub(SwaggerParser, "validate").rejects(new Error("Invalid specification"));
      const parseStub = sinon
        .stub(specParser.parser, "parse")
        .rejects(new Error("Invalid specification"));
      try {
        await specParser.list();
        expect.fail("Expected an error to be thrown");
      } catch (err) {
        expect((err as SpecParserError).message).contain("Invalid specification");
        expect((err as SpecParserError).errorType).to.equal(ErrorType.ListFailed);
      }
    });
  });
});
