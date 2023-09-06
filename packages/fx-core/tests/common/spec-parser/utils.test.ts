// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import sinon from "sinon";
import axios from "axios";
import fs from "fs-extra";
import os from "os";
import * as util from "util";
import "mocha";
import {
  checkPostBody,
  checkParameters,
  checkServerUrl,
  convertPathToCamelCase,
  getRelativePath,
  getResponseJson,
  getUrlProtocol,
  isSupportedApi,
  isYamlSpecFile,
  updateFirstLetter,
  validateServer,
  resolveServerUrl,
} from "../../../src/common/spec-parser/utils";
import { OpenAPIV3 } from "openapi-types";
import { ConstantString } from "../../../src/common/spec-parser/constants";
import { ErrorType } from "../../../src/common/spec-parser/interfaces";
import { format } from "util";

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

  describe("convertPathToCamelCase", () => {
    it("should convert a path to camel case", () => {
      const path = "this/is/a/{test}/path";
      const expected = "ThisIsATestPath";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should convert a path to camel case start with /", () => {
      const path = "/this/is/a/{test}/path";
      const expected = "ThisIsATestPath";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return an empty string for an empty path", () => {
      const path = "";
      const expected = "";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return the same string for a path with no slashes", () => {
      const path = "test";
      const expected = "Test";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
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
                  required: true,
                },
              ],
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return true if method is POST, path is valid, and no required parameters", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            post: {
              parameters: [
                {
                  in: "query",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return true if method is POST, path is valid, parameter is supported and only one required param in parameters", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            post: {
              parameters: [
                {
                  in: "query",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          required: true,
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return false if method is POST, path is valid, parameter is supported and both postBody and parameters contains required param", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            post: {
              parameters: [
                {
                  in: "query",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          required: true,
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if method is POST, but requestBody contains unsupported parameter and required", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            post: {
              parameters: [
                {
                  in: "query",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        name: {
                          type: "array",
                          required: true,
                          items: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return true if method is POST, path is valid, parameter is supported and only one required param in postBody", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            post: {
              parameters: [
                {
                  in: "query",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, true);
    });

    it("should return false if method is GET, path is valid, parameter is supported, but response is empty", () => {
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
                  required: true,
                },
              ],
              responses: {
                400: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if method is not GET or POST", () => {
      const method = "PUT";
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
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
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
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
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
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if parameter is in header and required supported", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "header",
                  schema: { type: "string", required: true },
                },
              ],
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          name: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if there is no parameters", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [],
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if parameters is null", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              responses: {
                200: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });

    it("should return false if has parameters but no 20X response", () => {
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
              responses: {
                404: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const result = isSupportedApi(method, path, spec as any);
      assert.strictEqual(result, false);
    });
  });

  describe("getUrlProtocol", () => {
    it("should return the protocol of a valid URL", () => {
      const url = "https://example.com/path/to/file";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.equal("https:");
    });

    it("should return undefined for an invalid URL", () => {
      const url = "not a url";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.be.undefined;
    });

    it("should return undefined for relative url", () => {
      const url = "/v3";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.be.undefined;
    });

    it("should return the protocol for other protocol", () => {
      const url = "ftp://v1";
      const protocol = getUrlProtocol(url);
      expect(protocol).to.equal("ftp:");
    });
  });

  describe("checkRequiredParameters", () => {
    it("should valid if there is only one required parameter", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
    });

    it("should valid if there are multiple required parameters", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: true, schema: { type: "string" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 2);
      assert.strictEqual(result.optionalNum, 0);
    });

    it("should not valid if any required parameter is in header or cookie and is required", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
        { in: "header", required: true, schema: { type: "string" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, false);
    });

    it("should ignore in header or cookie if is not required", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
        { in: "header", required: false, schema: { type: "string" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 1);
      assert.strictEqual(result.optionalNum, 1);
    });

    it("should return false if any schema is array and required", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: true, schema: { type: "array" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, false);
    });

    it("should return false if any schema is object and required", () => {
      const paramObject = [
        { in: "query", required: false, schema: { type: "string" } },
        { in: "path", required: true, schema: { type: "object" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, false);
    });

    it("should return valid if any schema is object but optional", () => {
      const paramObject = [
        { in: "query", required: false, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "object" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 1);
    });
  });

  describe("checkPostBodyRequiredParameters", () => {
    it("should return 0 for an empty schema", () => {
      const schema = {};
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 0);
    });

    it("should return 1 if the schema has a required string property", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
            required: true,
          },
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.requiredNum, 1);
      assert.strictEqual(result.optionalNum, 0);
      assert.strictEqual(result.isValid, true);
    });

    it("should return 0 if the schema has an optional string property", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
            required: false,
          },
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 1);
      assert.strictEqual(result.isValid, true);
    });

    it("should return the correct count for a nested schema", () => {
      const schema = {
        type: "object",
        properties: {
          name: {
            type: "string",
            required: true,
          },
          address: {
            type: "object",
            properties: {
              street: {
                type: "string",
                required: true,
              },
              city: {
                type: "string",
                required: false,
              },
            },
          },
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.requiredNum, 2);
      assert.strictEqual(result.optionalNum, 1);
      assert.strictEqual(result.isValid, true);
    });

    it("should return NaN for an unsupported schema type", () => {
      const schema = {
        type: "array",
        required: true,
        items: {
          type: "string",
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.isValid, false);
    });
  });

  describe("checkServerUrl", () => {
    it("should return an empty array if the server URL is valid", () => {
      const servers = [{ url: "https://example.com" }];
      const errors = checkServerUrl(servers);
      assert.deepStrictEqual(errors, []);
    });

    it("should return an error if the server URL is relative", () => {
      const servers = [{ url: "/api" }];
      const errors = checkServerUrl(servers);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.RelativeServerUrlNotSupported,
          content: ConstantString.RelativeServerUrlNotSupported,
          data: servers,
        },
      ]);
    });

    it("should return an error if the server URL protocol is not HTTPS", () => {
      const servers = [{ url: "http://example.com" }];
      const errors = checkServerUrl(servers);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: util.format(ConstantString.UrlProtocolNotSupported, "http:"),
          data: servers,
        },
      ]);
    });
  });

  describe("validateServer", () => {
    it("should return an error if there is no server information", () => {
      const spec = { paths: {} };
      const errors = validateServer(spec as OpenAPIV3.Document);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.NoServerInformation,
          content: ConstantString.NoServerInformation,
        },
      ]);
    });

    it("should return an error if there is no server information in supported apis", () => {
      const spec = {
        paths: {
          "/api": {
            get: {
              servers: [{ url: "ftp://example.com" }],
            },
          },
        },
      };
      const errors = validateServer(spec as any);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.NoServerInformation,
          content: ConstantString.NoServerInformation,
        },
      ]);
    });

    it("should validate top-level servers", () => {
      const spec = {
        servers: [{ url: "https://example.com" }],
        paths: {},
      };
      const errors = validateServer(spec as OpenAPIV3.Document);
      assert.deepStrictEqual(errors, []);
    });

    it("should validate path-level servers", () => {
      const spec = {
        paths: {
          "/api": {
            servers: [{ url: "https://example.com" }],
          },
        },
      };
      const errors = validateServer(spec as any);
      assert.deepStrictEqual(errors, []);
    });

    it("should validate operation-level servers", () => {
      const spec = {
        paths: {
          "/api": {
            get: {
              servers: [{ url: "https://example.com" }],
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
              responses: {
                200: {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const errors = validateServer(spec as any);
      assert.deepStrictEqual(errors, []);
    });

    it("should validate all levels of servers", () => {
      const spec = {
        servers: [{ url: "https://example.com" }],
        paths: {
          "/api": {
            servers: [{ url: "https://example.com" }],
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
              servers: [{ url: "https://example.com" }],
              responses: {
                200: {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const errors = validateServer(spec as any);
      assert.deepStrictEqual(errors, []);
    });

    it("should validate invalid server URLs", () => {
      const spec = {
        servers: [{ url: "/api" }],
        paths: {
          "/api": {
            servers: [{ url: "http://example.com" }],
            get: {
              parameters: [
                {
                  in: "query",
                  schema: { type: "string" },
                },
              ],
              servers: [{ url: "ftp://example.com" }],
              responses: {
                200: {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };
      const errors = validateServer(spec as any);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.RelativeServerUrlNotSupported,
          content: ConstantString.RelativeServerUrlNotSupported,
          data: spec.servers,
        },
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: util.format(ConstantString.UrlProtocolNotSupported, "http:"),
          data: spec.paths["/api"].servers,
        },
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: util.format(ConstantString.UrlProtocolNotSupported, "ftp:"),
          data: spec.paths["/api"].get.servers,
        },
      ]);
    });
  });

  describe("getResponseJson", () => {
    it("should return an empty object if no JSON response is defined", () => {
      const operationObject = {};
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({});
    });

    it("should return the JSON response for status code 200", () => {
      const operationObject = {
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      });
    });

    it("should return the JSON response for status code 201", () => {
      const operationObject = {
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            id: { type: "number" },
          },
        },
      });
    });

    it("should return the JSON response for the default status code", () => {
      const operationObject = {
        responses: {
          default: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      });
    });

    it("should return the JSON response for the 200 status code", () => {
      const operationObject = {
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "number" },
                  },
                },
              },
            },
          },
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      });
    });

    it("should return an empty object if all JSON responses are undefined", () => {
      const operationObject = {
        responses: {
          "400": {
            content: {
              "application/xml": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "500": {
            content: {
              "text/plain": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      } as any;
      const json = getResponseJson(operationObject);
      expect(json).to.deep.equal({});
    });
  });

  describe("resolveServerUrl", () => {
    it("should replace one environment variables in the URL", () => {
      process.env.OPENAPI_SERVER_URL = "https://localhost:3000/api";
      const url = "${{OPENAPI_SERVER_URL}}";
      const expectedUrl = "https://localhost:3000/api";
      const resolvedUrl = resolveServerUrl(url);
      assert.strictEqual(resolvedUrl, expectedUrl);
    });

    it("should throw an error if environment variable is not defined", () => {
      delete process.env.OPENAPI_SERVER_URL;
      const url = "${{OPENAPI_SERVER_URL}}";
      const expectedUrl = "https://localhost:3000/api";
      assert.throws(
        () => resolveServerUrl(url),
        Error,
        format(ConstantString.ResolveServerUrlFailed, "OPENAPI_SERVER_URL")
      );
    });

    it("should replace multiple environment variables in the URL", () => {
      process.env.API_HOST = "localhost";
      process.env.API_PORT = "3000";
      const url = "http://${{API_HOST}}:${{API_PORT}}/api";
      const expectedUrl = "http://localhost:3000/api";
      const resolvedUrl = resolveServerUrl(url);
      assert.strictEqual(resolvedUrl, expectedUrl);
    });

    it("should throw an error if one environment variable is not defined", () => {
      delete process.env.API_PORT;
      process.env.API_HOST = "localhost";
      const url = "http://${{API_HOST}}:${{API_PORT}}/api";
      assert.throws(
        () => resolveServerUrl(url),
        Error,
        format(ConstantString.ResolveServerUrlFailed, "API_PORT")
      );
    });
  });
});
