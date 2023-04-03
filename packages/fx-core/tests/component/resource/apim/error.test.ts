// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import {
  AadOperationError,
  AssertNotEmpty,
  BuildError,
  InvalidAadObjectId,
} from "../../../../src/component/resource/apim/error";

describe("Error", () => {
  describe("#AssertNotEmpty()", () => {
    it("Undefined string", () => {
      const testStr = undefined;
      chai
        .expect(() => AssertNotEmpty("testStr", testStr))
        .to.throw("Property 'testStr' is empty.");
    });

    it("null string", () => {
      const testStr = null;
      chai
        .expect(() => AssertNotEmpty("testStr", testStr))
        .to.throw("Property 'testStr' is empty.");
    });

    it("empty string", () => {
      const testStr = "";
      chai
        .expect(() => AssertNotEmpty("testStr", testStr))
        .to.throw("Property 'testStr' is empty.");
    });

    it("not empty string", () => {
      const testStr = "test";
      chai.expect(AssertNotEmpty("testStr", testStr)).to.equal("test");
    });
  });
  describe("#BuildError()", () => {
    it("InvalidAadObjectId", () => {
      const error = BuildError(InvalidAadObjectId, "test");
      chai.assert.equal(
        error.message,
        "The Azure Active Directory application with object id 'test' could not be found."
      );
    });

    it("AadOperationError(error)", () => {
      const error = BuildError(
        AadOperationError,
        new Error("inner error"),
        "test-operation",
        "test-resource"
      );
      chai.assert.equal(error.message, `Unable to test-operation test-resource. inner error`);
    });
  });
});
