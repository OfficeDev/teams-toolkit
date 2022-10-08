// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as chai from "chai";

import { maskArrayValue, maskValue } from "../../src/debug/localTelemetryReporter";

describe("LocalTelemetryReporter", () => {
  describe("maskValue()", () => {
    it("mask undefined value without known values", () => {
      const res = maskValue(undefined);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask unknown value without known values", () => {
      const res = maskValue("unknown test value");
      chai.assert.equal(res, "<unknown>");
    });

    it("mask undefined value with string known values", () => {
      const res = maskValue(undefined, ["test known value"]);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask unknown value with string known values", () => {
      const res = maskValue("unknown test value", ["test known value"]);
      chai.assert.equal(res, "<unknown>");
    });

    it("mask known value with string known values", () => {
      const res = maskValue("test known value", ["test known value"]);
      chai.assert.equal(res, "test known value");
    });

    it("mask undefined value with mask value", () => {
      const res = maskValue(undefined, [{ value: "test known value", mask: "<default>" }]);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask unknown value with mask values", () => {
      const res = maskValue("unknown test value", [
        { value: "test known value", mask: "<default>" },
      ]);
      chai.assert.equal(res, "<unknown>");
    });

    it("mask known value with mask values", () => {
      const res = maskValue("test known value", [{ value: "test known value", mask: "<default>" }]);
      chai.assert.equal(res, "<default>");
    });
  });

  describe("maskArrayValue()", () => {
    it("mask undefined value without known values", () => {
      const res = maskArrayValue(undefined);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask empty array value without known values", () => {
      const res = maskArrayValue([]);
      chai.assert.sameDeepOrderedMembers(res as string[], []);
    });

    it("mask unknown array value without known values", () => {
      const res = maskArrayValue(["unknown test value1", "unknown test value2"]);
      chai.assert.sameDeepOrderedMembers(res as string[], ["<unknown>", "<unknown>"]);
    });

    it("mask values with string known values", () => {
      const res = maskArrayValue(["test known value", "unknown test value"], ["test known value"]);
      chai.assert.sameDeepOrderedMembers(res as string[], ["test known value", "<unknown>"]);
    });

    it("mask values with mask value", () => {
      const res = maskArrayValue(
        ["test known value"],
        [{ value: "test known value", mask: "<default>" }]
      );
      chai.assert.sameDeepOrderedMembers(res as string[], ["<default>"]);
    });
  });
});
