// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import {
  checkPostBody,
  checkParameters,
  checkServerUrl,
  convertPathToCamelCase,
  getResponseJson,
  getUrlProtocol,
  isSupportedApi,
  updateFirstLetter,
  validateServer,
  resolveServerUrl,
  isWellKnownName,
  format,
  getSafeRegistrationIdEnvName,
} from "../src/utils";
import { OpenAPIV3 } from "openapi-types";
import { ConstantString } from "../src/constants";
import { ErrorType } from "../src/interfaces";

describe("utils", () => {
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

    it("should return correct result for string with {} and .", () => {
      const path = "/{section}.json";
      const expected = "SectionJson";
      const result = convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return correct result for complex string", () => {
      const path = "/{section}.{test1}/{test2}.json";
      const expected = "SectionTest1Test2Json";
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, true);
    });

    it("should return false if have no operationId with allowMissingId is false", () => {
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
      const result = isSupportedApi(method, path, spec as any, false, false, false, false);
      assert.strictEqual(result, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, true);
    });

    it("should return false if method is POST, path is valid, parameter is supported and only one required param in parameters but contains auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            api_key: {
              type: "apiKey",
              name: "api_key",
              in: "header",
            },
            api_key2: {
              type: "apiKey",
              name: "api_key2",
              in: "header",
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  api_key2: [],
                },
              ],
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, false);
    });

    it("should return true if allowAPIKeyAuth is true and contains apiKey auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            api_key: {
              type: "apiKey",
              name: "api_key",
              in: "header",
            },
            api_key2: {
              type: "apiKey",
              name: "api_key2",
              in: "header",
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  api_key2: [],
                },
              ],
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, true, false, false);
      assert.strictEqual(result, true);
    });

    it("should return false if allowAPIKeyAuth is true but contains multiple apiKey auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            api_key: {
              type: "apiKey",
              name: "api_key",
              in: "header",
            },
            api_key2: {
              type: "apiKey",
              name: "api_key2",
              in: "header",
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  api_key2: [],
                  api_key: [],
                },
              ],
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, true, false, false);
      assert.strictEqual(result, false);
    });

    it("should return true if allowOauth2 is true and contains aad auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            oauth: {
              type: "oauth2",
              flows: {
                implicit: {
                  authorizationUrl: "https://example.com/api/oauth/dialog",
                  scopes: {
                    "write:pets": "modify pets in your account",
                    "read:pets": "read your pets",
                  },
                },
              },
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  oauth: ["read:pets"],
                },
              ],
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, true);
      assert.strictEqual(result, true);
    });

    it("should return false if allowAPIKeyAuth is true, allowOauth2 is false, but contains aad auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            api_key: {
              type: "apiKey",
              name: "api_key",
              in: "header",
            },
            oauth: {
              type: "oauth2",
              flows: {
                implicit: {
                  authorizationUrl: "https://example.com/api/oauth/dialog",
                  scopes: {
                    "write:pets": "modify pets in your account",
                    "read:pets": "read your pets",
                  },
                },
              },
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  oauth: ["read:pets"],
                },
              ],
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, true, false, false);
      assert.strictEqual(result, false);
    });

    it("should return false if allowAPIKeyAuth is true, allowOauth2 is false, and contains aad auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            api_key: {
              type: "apiKey",
              name: "api_key",
              in: "header",
            },
            oauth: {
              type: "oauth2",
              flows: {
                implicit: {
                  authorizationUrl: "https://example.com/api/oauth/dialog",
                  scopes: {
                    "write:pets": "modify pets in your account",
                    "read:pets": "read your pets",
                  },
                },
              },
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  oauth: ["read:pets"],
                },
              ],
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, true, false, true);
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, false);
    });

    it("should support multiple required parameters", () => {
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
                      required: ["name"],
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
      const result = isSupportedApi(method, path, spec as any, true, false, true, false);
      assert.strictEqual(result, true);
    });

    it("should not support multiple required parameters count larger than 5", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      required: ["id1", "id2", "id3", "id4", "id5", "id6"],
                      properties: {
                        id1: {
                          type: "string",
                        },
                        id2: {
                          type: "string",
                        },
                        id3: {
                          type: "string",
                        },
                        id4: {
                          type: "string",
                        },
                        id5: {
                          type: "string",
                        },
                        id6: {
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
      const result = isSupportedApi(method, path, spec as any, true, false, true, false);
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
                      required: ["name"],
                      properties: {
                        name: {
                          type: "array",
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, false);
    });

    it("should return true if method is POST, but requestBody contains unsupported parameter and required but has default value", () => {
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
                      required: ["name"],
                      properties: {
                        name: {
                          type: "array",
                          default: ["item"],
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, true);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, false);
    });

    it("should return false if parameter is not supported and required", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  required: true,
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
      assert.strictEqual(result, false);
    });

    it("should ignore unsupported schema type with default value", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        paths: {
          "/users": {
            get: {
              parameters: [
                {
                  in: "query",
                  required: true,
                  schema: { type: "object", default: { name: "test" } },
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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
      const result = isSupportedApi(method, path, spec as any, true, false, false, false);
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

    it("should valid if parameter in header or cookie is required but have default value", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
        { in: "header", required: true, schema: { type: "string", default: "value" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
      // header param is ignored
      assert.strictEqual(result.requiredNum, 1);
      assert.strictEqual(result.optionalNum, 1);
    });

    it("should treat required param with default value as optional param", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string", default: "value" } },
        { in: "path", required: false, schema: { type: "string" } },
        { in: "query", required: true, schema: { type: "string" } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 1);
      assert.strictEqual(result.optionalNum, 2);
    });

    it("should ignore required query param with default value and array type", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
        { in: "query", required: true, schema: { type: "array", default: ["item"] } },
      ];
      const result = checkParameters(paramObject as OpenAPIV3.ParameterObject[]);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 1);
      assert.strictEqual(result.optionalNum, 1);
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

    it("should treat required schema with default value as optional param", () => {
      const schema = {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
            default: "value",
          },
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 1);
      assert.strictEqual(result.isValid, true);
    });

    it("should return 1 if the schema has a required string property", () => {
      const schema = {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "string",
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
        required: ["name", "address"],
        properties: {
          name: {
            type: "string",
          },
          address: {
            type: "object",
            required: ["street"],
            properties: {
              street: {
                type: "string",
              },
              city: {
                type: "string",
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

    it("should return not valid for an unsupported schema type", () => {
      const schema = {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.isValid, false);
    });

    it("should return valid for an unsupported schema type but it is required with default value", () => {
      const schema = {
        type: "object",
        required: ["name"],
        properties: {
          name: {
            type: "array",
            default: ["item"],
            items: {
              type: "string",
            },
          },
        },
      };
      const result = checkPostBody(schema as any);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 0);
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
          content: format(ConstantString.UrlProtocolNotSupported, "http"),
          data: "http",
        },
      ]);
    });
  });

  describe("validateServer", () => {
    it("should return an error if there is no server information", () => {
      const spec = { paths: {} };
      const errors = validateServer(spec as OpenAPIV3.Document, true, false, false, false);
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
      const errors = validateServer(spec as any, true, false, false, false);
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
      const errors = validateServer(spec as OpenAPIV3.Document, true, false, false, false);
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
      const errors = validateServer(spec as any, true, false, false, false);
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
      const errors = validateServer(spec as any, true, false, false, false);
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
      const errors = validateServer(spec as any, true, false, false, false);
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
      const errors = validateServer(spec as any, true, false, false, false);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.RelativeServerUrlNotSupported,
          content: ConstantString.RelativeServerUrlNotSupported,
          data: spec.servers,
        },
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: format(ConstantString.UrlProtocolNotSupported, "http"),
          data: "http",
        },
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: format(ConstantString.UrlProtocolNotSupported, "ftp"),
          data: "ftp",
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

  describe("isWellKnownName", () => {
    it("should return true for well-known result property names", () => {
      expect(isWellKnownName("result", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("r_e_s_u_l_t", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("r-e-s-u-l-t", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("data", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("items", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("root", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("matches", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("queries", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("list", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("output", ConstantString.WellknownResultNames)).to.be.true;
    });

    it("should return true for well-known result property names with different casing", () => {
      expect(isWellKnownName("Result", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("DaTa", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("ITEMS", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("Root", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("MaTcHeS", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("QuErIeS", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("LiSt", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("OutPut", ConstantString.WellknownResultNames)).to.be.true;
    });

    it("should return true for name substring is well-known result property names", () => {
      expect(isWellKnownName("testResult", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("carData", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("productItems", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("rootValue", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("matchesResult", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("DataQueries", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("productLists", ConstantString.WellknownResultNames)).to.be.true;
      expect(isWellKnownName("outputData", ConstantString.WellknownResultNames)).to.be.true;
    });

    it("should return false for non well-known result property names", () => {
      expect(isWellKnownName("foo", ConstantString.WellknownResultNames)).to.be.false;
      expect(isWellKnownName("bar", ConstantString.WellknownResultNames)).to.be.false;
      expect(isWellKnownName("baz", ConstantString.WellknownResultNames)).to.be.false;
      expect(isWellKnownName("qux", ConstantString.WellknownResultNames)).to.be.false;
    });
  });

  describe("format", () => {
    it("should replace %s placeholders with arguments", () => {
      const result = format("Hello, %s!", "world");
      expect(result).to.equal("Hello, world!");
    });

    it("should handle multiple placeholders and arguments", () => {
      const result = format("The %s is %s.", "answer", "42");
      expect(result).to.equal("The answer is 42.");
    });

    it("should handle missing arguments", () => {
      const result = format("Hello, %s!", "");
      expect(result).to.equal("Hello, !");
    });

    it("should handle extra arguments", () => {
      const result = format("Hello, %s!", "world", "extra");
      expect(result).to.equal("Hello, world!");
    });

    it("should handle no placeholders", () => {
      const result = format("Hello, world!");
      expect(result).to.equal("Hello, world!");
    });
  });

  describe("getSafeRegistrationIdEnvName", () => {
    it("should return an empty string if authName is not provided", () => {
      expect(getSafeRegistrationIdEnvName("")).to.equal("");
    });

    it("should replace non-alphanumeric characters with underscores and convert to uppercase", () => {
      expect(getSafeRegistrationIdEnvName("auth@name")).to.equal("AUTH_NAME");
    });

    it('should prefix the result with "PREFIX_" if it does not start with an uppercase letter', () => {
      expect(getSafeRegistrationIdEnvName("1authname")).to.equal("PREFIX_1AUTHNAME");
    });

    it('should not prefix the result with "PREFIX_" if it starts with an uppercase letter', () => {
      expect(getSafeRegistrationIdEnvName("Authname")).to.equal("AUTHNAME");
    });

    it("should convert all lowercase letters to uppercase", () => {
      expect(getSafeRegistrationIdEnvName("authname")).to.equal("AUTHNAME");
    });
  });
});
