// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { SpecParser } from "../../../src/common/spec-parser/specParser";
import { ErrorType, ValidationStatus } from "../../../src/common/spec-parser/interfaces";
import SwaggerParser from "@apidevtools/swagger-parser";
import { SpecParserError } from "../../../src/common/spec-parser/specParserError";
import { ConstantString } from "../../../src/common/spec-parser/constants";

describe("SpecParser", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("validate", () => {
    it("should return a valid result when the spec is valid", async () => {
      const parser = new SpecParser("/path/to/spec.yaml");
      const validateStub = sinon.stub(SwaggerParser, "validate").resolves({} as any);

      const result = await parser.validate();

      expect(result.status).to.equal(ValidationStatus.Valid);
      expect(result.warnings).to.be.an("array").that.is.empty;
      expect(result.errors).to.be.an("array").that.is.empty;
      sinon.assert.calledOnce(validateStub);
    });

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
