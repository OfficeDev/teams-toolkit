// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { SpecParser } from "../../../src/common/spec-parser/specParser";
import { ErrorType } from "../../../src/common/spec-parser/interfaces";
import SwaggerParser from "@apidevtools/swagger-parser";
import { SpecParserError } from "../../../src/common/spec-parser/specParserError";

describe("SpecParser", () => {
  afterEach(() => {
    sinon.restore();
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
