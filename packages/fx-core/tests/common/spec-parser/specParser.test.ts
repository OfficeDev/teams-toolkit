// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as util from "util";
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

describe("SpecParser", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("validate", () => {
    it("should return an error result when the spec is not valid", async () => {
      const parser = new SpecParser("/path/to/spec.yaml");
      const validateStub = sinon.stub(SwaggerParser, "validate").rejects(new Error("Invalid spec"));

      const result = await parser.validate();

      expect(result.status).to.equal(ValidationStatus.Error);
      expect(result.warnings).to.be.an("array").that.is.empty;
      expect(result.errors).to.be.an("array").that.has.lengthOf(1);
      expect(result.errors[0].type).to.equal(ErrorType.SpecNotValid);
      expect(result.errors[0].content).to.equal("Error: Invalid spec");
      sinon.assert.calledOnce(validateStub);
    });

    it("should return an error result object if the spec version is not supported", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "2.0.0" };
      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves({} as any);

      const result = await new SpecParser(specPath).validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          { type: ErrorType.VersionNotSupported, content: ConstantString.SpecVersionNotSupported },
        ],
      });
      sinon.assert.calledOnce(validateStub);
    });

    it("should return an error result object if no server information", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0" };
      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves({} as any);

      const result = await new SpecParser(specPath).validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          { type: ErrorType.NoServerInformation, content: ConstantString.NoServerInformation },
          { type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi },
        ],
      });
      sinon.assert.calledOnce(validateStub);
    });

    it("should return an error result object if has multiple server information", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0", servers: ["server1", "server2"] };
      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves({} as any);

      const result = await new SpecParser(specPath).validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [
          {
            type: ErrorType.MultipleServerInformation,
            content: ConstantString.MultipleServerInformation,
          },
          { type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi },
        ],
      });
      sinon.assert.calledOnce(validateStub);
    });

    it("should return an error result object if no supported apis", async function () {
      const specPath = "path/to/spec";
      const spec = { openapi: "3.0.0", servers: ["server1"] };
      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves({} as any);

      const result = await new SpecParser(specPath).validate();

      expect(result).to.deep.equal({
        status: ValidationStatus.Error,
        warnings: [],
        errors: [{ type: ErrorType.NoSupportedApi, content: ConstantString.NoSupportedApi }],
      });
      sinon.assert.calledOnce(validateStub);
    });

    it("should return an error result object if contain remote reference", async function () {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.2",
        servers: [
          {
            url: "/v3",
          },
        ],
        paths: {
          "/pet": {
            post: {
              tags: ["pet"],
              summary: "Add a new pet to the store",
              operationId: "addPet",
              responses: {
                "200": {
                  content: {
                    "application/xml": {
                      schema: {
                        $ref: "https://fake-url/pet.yml",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves(spec as any);

      const result = await new SpecParser(specPath).validate();

      expect(result.errors[0].type).equal(ErrorType.RemoteRefNotSupported);
      expect(result.status).equal(ValidationStatus.Error);

      sinon.assert.calledOnce(validateStub);
    });

    it("should return an warning result object if missing operation id", async function () {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.2",
        servers: [
          {
            url: "/v3",
          },
        ],
        paths: {
          "/pet": {
            post: {
              tags: ["pet"],
              summary: "Add a new pet to the store",
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

      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves(spec as any);

      const result = await new SpecParser(specPath).validate();
      expect(result).to.deep.equal({
        status: ValidationStatus.Warning,
        warnings: [
          {
            type: WarningType.OperationIdMissing,
            content: util.format(ConstantString.MissingOperationId, "POST /pet"),
          },
        ],
        errors: [],
      });
      sinon.assert.calledOnce(validateStub);
    });

    it("should return a valid result when the spec is valid", async () => {
      const specPath = "path/to/spec";
      const spec = {
        openapi: "3.0.2",
        servers: [
          {
            url: "/v3",
          },
        ],
        paths: {
          "/pet": {
            post: {
              tags: ["pet"],
              operationId: "addPet",
              summary: "Add a new pet to the store",
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

      const validateStub = sinon.stub(SwaggerParser, "validate").resolves(spec as any);
      sinon.stub(SwaggerParser, "parse").resolves(spec as any);

      const result = await new SpecParser(specPath).validate();

      expect(result.status).to.equal(ValidationStatus.Valid);
      expect(result.warnings).to.be.an("array").that.is.empty;
      expect(result.errors).to.be.an("array").that.is.empty;
      sinon.assert.calledOnce(validateStub);
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
  });

  describe("list", () => {
    it("should return a list of HTTP methods and paths for all GET and POST operations without security", async () => {
      const specPath = "valid-spec.yaml";
      const parser = new SpecParser(specPath);
      sinon.stub(SwaggerParser, "validate").resolves({
        paths: {
          "/pets/{petId}": {
            get: {
              operationId: "getPetById",
              security: [{ api_key: [] }],
            },
          },
          "/user/{userId}": {
            get: {
              operationId: "getUserById",
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
      } as any);
      const result = await parser.list();

      expect(result).to.deep.equal(["GET /user/{userId}", "POST /store/order"]);
    });

    it("should throw an error when the SwaggerParser library throws an error", async () => {
      const specPath = "invalid-spec.yaml";
      const parser = new SpecParser(specPath);
      sinon.stub(SwaggerParser, "validate").rejects(new Error("Invalid specification"));

      try {
        await parser.list();
        expect.fail("Expected an error to be thrown");
      } catch (err) {
        expect((err as SpecParserError).message).contain("Invalid specification");
        expect((err as SpecParserError).errorType).to.equal(ErrorType.ListFailed);
      }
    });
  });
});
