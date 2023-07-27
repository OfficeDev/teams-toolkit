// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import fs from "fs-extra";
import os from "os";
import "mocha";
import {
  getRelativePath,
  isSupportedApi,
  isYamlSpecFile,
  updateFirstLetter,
} from "../../../src/common/spec-parser/utils";

describe("utils", () => {
  describe("isYamlSpecFile", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("should return false for a valid JSON file", async () => {
      const result = await isYamlSpecFile("test.json");
      expect(result).to.be.false;
    });

    it("should return true for an yaml file", async () => {
      const result = await isYamlSpecFile("test.yaml");
      expect(result).to.be.true;
    });

    it("should handle local json files", async () => {
      const readFileStub = sinon.stub(fs, "readFile").resolves('{"name": "test"}' as any);
      const result = await isYamlSpecFile("path/to/localfile");
      expect(result).to.be.false;
    });

    it("should handle remote files", async () => {
      const axiosStub = sinon.stub(axios, "get").resolves({ data: '{"name": "test"}' });
      const result = await isYamlSpecFile("http://example.com/remotefile");
      expect(result).to.be.false;
    });
  });

  describe("updateFirstLetter", () => {
    it("should return the string with the first letter capitalized", () => {
      const result = updateFirstLetter("hello");
      expect(result).to.equal("Hello");
    });

    it("should return an empty string if the input is empty", () => {
      const result = updateFirstLetter("");
      expect(result).to.equal("");
    });
  });

  describe("getRelativePath", () => {
    it("should return the correct relative path", () => {
      const from = "/path/to/from";
      const to = "/path/to/file.txt";
      const result = getRelativePath(from, to);
      expect(result).to.equal("file.txt");
    });

    it("should get relative path with subfolder", () => {
      const from = "/path/to/from";
      const to = "/path/to/subfolder/file.txt";
      const result = getRelativePath(from, to);
      expect(result).to.equal("subfolder/file.txt");
    });

    it("should replace backslashes with forward slashes on Windows", () => {
      if (os.platform() === "win32") {
        const from = "c:\\path\\to\\from";
        const to = "c:\\path\\to\\subfolder\\file.txt";
        const result = getRelativePath(from, to);
        expect(result).to.equal("subfolder/file.txt");
      }
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

    it("should return true if parameter length is 0", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [],
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return true if parameter is null", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {},
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });
  });
});
