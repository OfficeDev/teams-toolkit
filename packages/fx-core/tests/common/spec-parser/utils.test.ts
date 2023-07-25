import { assert, expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import fs from "fs-extra";
import "mocha";
import { isSupportedApi, isYamlSpecFile } from "../../../src/common/spec-parser/utils";

describe("utils", () => {
  describe("isYamlSpecFile", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("should return false for a valid JSON file", async () => {
      const readFileStub = sinon.stub(fs, "readFile").resolves('{"name": "test"}' as any);
      const result = await isYamlSpecFile("test.json");
      expect(result).to.be.false;
    });

    it("should return true for an yaml file", async () => {
      const readFileStub = sinon.stub(fs, "readFile").resolves("openapi: 3.0.2" as any);
      const result = await isYamlSpecFile("test.json");
      expect(result).to.be.true;
    });

    it("should handle remote files", async () => {
      const axiosStub = sinon.stub(axios, "get").resolves({ data: '{"name": "test"}' });
      const result = await isYamlSpecFile("http://example.com/test.json");
      expect(result).to.be.false;
    });
  });

  describe("isSupportedApi", () => {
    it("should return true if method is GET, path is valid, and parameter is supported", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return false if method is not GET", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if path is not valid", () => {
      const method = "GET";
      const path = "/invalid";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if parameter is not supported", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "object" },
                },
              ],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });
  });
});
