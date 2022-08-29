import "mocha";
import { expect } from "chai";
import {
  checkApiNameValid,
  checkEmptySelect,
  checkEmptyValue,
  checkHttp,
  checkIsGuid,
} from "../../../../src/component/feature/apiconnector/checker";

describe("Checker in Api Connector", () => {
  describe("checkEmptyValue", () => {
    it("checkEmptyValue: with value", async () => {
      const res = await checkEmptyValue("value");
      expect(res).equal(undefined);
    });

    it("checkEmptyValue: empty", async () => {
      const res = await checkEmptyValue("");
      expect(res).equal("The value should not be empty");
    });
  });

  describe("checkApiNameValid", () => {
    it("checkApiNameValid: valid name", async () => {
      const res = await checkApiNameValid("test1");
      expect(res).equal(undefined);
    });

    it("checkEmptyValue: non alphanumeric value", async () => {
      const res = await checkApiNameValid("--");
      expect(res).not.equal(undefined);
    });

    it("checkEmptyValue: start with number", async () => {
      const res = await checkApiNameValid("1test");
      expect(res).not.equal(undefined);
    });
  });

  describe("checkEmptySelect", () => {
    it("checkEmptySelect: contains items", async () => {
      const input = ["test1", "test2"];
      const res = await checkEmptySelect(input);
      expect(res).equal(undefined);
    });

    it("checkEmptySelect: empty", async () => {
      const res = await checkEmptySelect([]);
      expect(res).not.equal(undefined);
    });
  });

  describe("checkIsGuid", () => {
    it("checkIsGuid: valid guid", async () => {
      const res = await checkIsGuid("8734b71a-8dac-41ad-b1d6-7153db95526f");
      expect(res).equal(undefined);
    });

    it("checkIsGuid: invalid input", async () => {
      const res = await checkIsGuid("1234");
      expect(res).not.equal(undefined);
    });
  });

  describe("checkHttp", () => {
    it("checkHttp: valid https", async () => {
      const res = await checkHttp("https://test.com");
      expect(res).equal(undefined);
    });

    it("checkHttp: valid http", async () => {
      const res = await checkHttp("http://test.com");
      expect(res).equal(undefined);
    });

    it("checkHttp: invalid input", async () => {
      const res = await checkHttp("1234");
      expect(res).not.equal(undefined);
    });
  });
});
