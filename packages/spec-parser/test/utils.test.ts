// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import { Utils } from "../src/utils";
import { OpenAPIV3 } from "openapi-types";
import { ConstantString } from "../src/constants";
import { ErrorType, ProjectType, ParseOptions } from "../src/interfaces";

describe("utils", () => {
  describe("updateFirstLetter", () => {
    it("should return the string with the first letter capitalized", () => {
      const result = Utils.updateFirstLetter("hello");
      expect(result).to.equal("Hello");
    });

    it("should return an empty string if the input is empty", () => {
      const result = Utils.updateFirstLetter("");
      expect(result).to.equal("");
    });
  });

  describe("convertPathToCamelCase", () => {
    it("should convert a path to camel case", () => {
      const path = "this/is/a/{test}/path";
      const expected = "ThisIsATestPath";
      const result = Utils.convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should convert a path to camel case start with /", () => {
      const path = "/this/is/a/{test}/path";
      const expected = "ThisIsATestPath";
      const result = Utils.convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return an empty string for an empty path", () => {
      const path = "";
      const expected = "";
      const result = Utils.convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return the same string for a path with no slashes", () => {
      const path = "test";
      const expected = "Test";
      const result = Utils.convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return correct result for string with {} and .", () => {
      const path = "/{section}.json";
      const expected = "SectionJson";
      const result = Utils.convertPathToCamelCase(path);
      assert.strictEqual(result, expected);
    });

    it("should return correct result for complex string", () => {
      const path = "/{section}.{test1}/{test2}.json";
      const expected = "SectionTest1Test2Json";
      const result = Utils.convertPathToCamelCase(path);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: false,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if allowBearerTokenAuth is true and contains bearer token auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        components: {
          securitySchemes: {
            bearer_token1: {
              type: "http",
              scheme: "bearer",
            },
            bearer_token2: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
        paths: {
          "/users": {
            post: {
              security: [
                {
                  bearer_token2: [],
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowBearerTokenAuth: true,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: true,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: true,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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
                authorizationCode: {
                  authorizationUrl: "https://example.com/api/oauth/dialog",
                  tokenUrl: "https://example.com/api/oauth/token",
                  refreshUrl: "https://example.com/api/outh/refresh",
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
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: true,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
    });

    it("should return false if allowAPIKeyAuth is true, allowOauth2 is false, but contain oauth", () => {
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
                authorizationCode: {
                  authorizationUrl: "https://example.com/api/oauth/dialog",
                  tokenUrl: "https://example.com/api/oauth/token",
                  refreshUrl: "https://example.com/api/outh/refresh",
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
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: true,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return false if allowAPIKeyAuth is true, allowOauth2 is true, but not auth code flow", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: true,
        allowMultipleParameters: false,
        allowOauth2: true,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if allowAPIKeyAuth is true, allowOauth2 is true, but not auth code flow for teams ai project", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: true,
        allowMultipleParameters: false,
        allowOauth2: true,
        projectType: ProjectType.TeamsAi,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if method is POST, path is valid, parameter is supported and both postBody and parameters contains multiple required param for copilot", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };
      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should support multiple required parameters count larger than 5 for teams ai project", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.TeamsAi,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
    });

    it("should not support multiple required parameters count larger than 5 for copilot", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: true,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
    });

    it("should return false if method is POST, but parameters contain nested object", () => {
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
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: {
                        type: "object",
                        properties: {
                          id: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              ],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "string",
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return false if method is POST, but requestBody contain nested object", () => {
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
                          type: "object",
                          properties: {
                            id: {
                              type: "string",
                            },
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return false if parameter is in header and required", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if parameter is in header and required for copilot", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if there is no parameters for copilot", () => {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return false if method is POST, but request body contains media type other than application/json", () => {
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
                  "application/xml": {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };
      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if method is POST, and request body contains media type other than application/json for teams ai project", () => {
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
                  "application/xml": {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.TeamsAi,
        allowMethods: ["get", "post"],
      };
      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
    });

    it("should return false if method is POST, and request body schema is not object", () => {
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
                      type: "string",
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return false if method is GET, but response body contains media type other than application/json", () => {
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
                    "application/xml": {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, false);
    });

    it("should return true if method is GET, and response body contains media type other than application/json for teams ai project", () => {
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
                    "application/xml": {
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.TeamsAi,
        allowMethods: ["get", "post"],
      };

      const result = Utils.isSupportedApi(method, path, spec as any, options);
      assert.strictEqual(result, true);
    });
  });

  describe("getUrlProtocol", () => {
    it("should return the protocol of a valid URL", () => {
      const url = "https://example.com/path/to/file";
      const protocol = Utils.getUrlProtocol(url);
      expect(protocol).to.equal("https:");
    });

    it("should return undefined for an invalid URL", () => {
      const url = "not a url";
      const protocol = Utils.getUrlProtocol(url);
      expect(protocol).to.be.undefined;
    });

    it("should return undefined for relative url", () => {
      const url = "/v3";
      const protocol = Utils.getUrlProtocol(url);
      expect(protocol).to.be.undefined;
    });

    it("should return the protocol for other protocol", () => {
      const url = "ftp://v1";
      const protocol = Utils.getUrlProtocol(url);
      expect(protocol).to.equal("ftp:");
    });
  });

  describe("checkRequiredParameters", () => {
    it("should valid if there is only one required parameter", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
      ];
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
      assert.strictEqual(result.isValid, true);
    });

    it("should valid if there are multiple required parameters", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: true, schema: { type: "string" } },
      ];
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
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
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
      assert.strictEqual(result.isValid, false);
    });

    it("should valid if parameter in header or cookie is required but have default value", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "string" } },
        { in: "header", required: true, schema: { type: "string", default: "value" } },
      ];
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
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
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
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
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
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
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 1);
      assert.strictEqual(result.optionalNum, 1);
    });

    it("should return false if any schema is array and required", () => {
      const paramObject = [
        { in: "query", required: true, schema: { type: "string" } },
        { in: "path", required: true, schema: { type: "array" } },
      ];
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
      assert.strictEqual(result.isValid, false);
    });

    it("should return false if any schema is object and required", () => {
      const paramObject = [
        { in: "query", required: false, schema: { type: "string" } },
        { in: "path", required: true, schema: { type: "object" } },
      ];
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
      assert.strictEqual(result.isValid, false);
    });

    it("should return valid if any schema is object but optional", () => {
      const paramObject = [
        { in: "query", required: false, schema: { type: "string" } },
        { in: "path", required: false, schema: { type: "object" } },
      ];
      const result = Utils.checkParameters(paramObject as OpenAPIV3.ParameterObject[], false);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 1);
    });
  });

  describe("checkPostBodyRequiredParameters", () => {
    it("should return 0 for an empty schema", () => {
      const schema = {};
      const result = Utils.checkPostBody(schema as any);
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
      const result = Utils.checkPostBody(schema as any);
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
      const result = Utils.checkPostBody(schema as any);
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
      const result = Utils.checkPostBody(schema as any);
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
      const result = Utils.checkPostBody(schema as any);
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
      const result = Utils.checkPostBody(schema as any);
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
      const result = Utils.checkPostBody(schema as any);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.requiredNum, 0);
      assert.strictEqual(result.optionalNum, 0);
    });
  });

  describe("checkServerUrl", () => {
    it("should return an empty array if the server URL is valid", () => {
      const servers = [{ url: "https://example.com" }];
      const errors = Utils.checkServerUrl(servers);
      assert.deepStrictEqual(errors, []);
    });

    it("should return an error if the server URL is relative", () => {
      const servers = [{ url: "/api" }];
      const errors = Utils.checkServerUrl(servers);
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
      const errors = Utils.checkServerUrl(servers);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: Utils.format(ConstantString.UrlProtocolNotSupported, "http"),
          data: "http",
        },
      ]);
    });
  });

  describe("validateServer", () => {
    it("should return an error if there is no server information", () => {
      const spec = { paths: {} };

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as OpenAPIV3.Document, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as OpenAPIV3.Document, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as any, options);
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
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as any, options);
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

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const errors = Utils.validateServer(spec as any, options);
      assert.deepStrictEqual(errors, [
        {
          type: ErrorType.RelativeServerUrlNotSupported,
          content: ConstantString.RelativeServerUrlNotSupported,
          data: spec.servers,
        },
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: Utils.format(ConstantString.UrlProtocolNotSupported, "http"),
          data: "http",
        },
        {
          type: ErrorType.UrlProtocolNotSupported,
          content: Utils.format(ConstantString.UrlProtocolNotSupported, "ftp"),
          data: "ftp",
        },
      ]);
    });
  });

  describe("hasNestedObjectInSchema", () => {
    it("should return false if schema type is not object", () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: "string",
      };
      expect(Utils.hasNestedObjectInSchema(schema)).to.be.false;
    });

    it("should return false if schema type is object but no nested object property", () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };
      expect(Utils.hasNestedObjectInSchema(schema)).to.be.false;
    });

    it("should return true if schema type is object and has nested object property", () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: "object",
        properties: {
          nestedObject: { type: "object" },
        },
      };
      expect(Utils.hasNestedObjectInSchema(schema)).to.be.true;
    });
  });

  describe("getResponseJson", () => {
    it("should return an empty object if no JSON response is defined", () => {
      const operationObject = {};
      const json = Utils.getResponseJson(operationObject);
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
      const json = Utils.getResponseJson(operationObject);
      expect(json).to.deep.equal({
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      });
    });

    it("should return empty JSON response for status code 200 with multiple media type", () => {
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
              "application/xml": {
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
      const json = Utils.getResponseJson(operationObject);
      expect(json).to.deep.equal({});
    });

    it("should return JSON response for status code 200 with multiple media type when it is teams ai project", () => {
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
              "application/xml": {
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
      const json = Utils.getResponseJson(operationObject, true);
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
      const json = Utils.getResponseJson(operationObject);
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
      const json = Utils.getResponseJson(operationObject);
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
      const json = Utils.getResponseJson(operationObject);
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
      const json = Utils.getResponseJson(operationObject);
      expect(json).to.deep.equal({});
    });
  });

  describe("resolveServerUrl", () => {
    it("should replace one environment variables in the URL", () => {
      process.env.OPENAPI_SERVER_URL = "https://localhost:3000/api";
      const url = "${{OPENAPI_SERVER_URL}}";
      const expectedUrl = "https://localhost:3000/api";
      const resolvedUrl = Utils.resolveServerUrl(url);
      assert.strictEqual(resolvedUrl, expectedUrl);
    });

    it("should throw an error if environment variable is not defined", () => {
      delete process.env.OPENAPI_SERVER_URL;
      const url = "${{OPENAPI_SERVER_URL}}";
      const expectedUrl = "https://localhost:3000/api";
      assert.throws(
        () => Utils.resolveServerUrl(url),
        Error,
        Utils.format(ConstantString.ResolveServerUrlFailed, "OPENAPI_SERVER_URL")
      );
    });

    it("should replace multiple environment variables in the URL", () => {
      process.env.API_HOST = "localhost";
      process.env.API_PORT = "3000";
      const url = "http://${{API_HOST}}:${{API_PORT}}/api";
      const expectedUrl = "http://localhost:3000/api";
      const resolvedUrl = Utils.resolveServerUrl(url);
      assert.strictEqual(resolvedUrl, expectedUrl);
    });

    it("should throw an error if one environment variable is not defined", () => {
      delete process.env.API_PORT;
      process.env.API_HOST = "localhost";
      const url = "http://${{API_HOST}}:${{API_PORT}}/api";
      assert.throws(
        () => Utils.resolveServerUrl(url),
        Error,
        Utils.format(ConstantString.ResolveServerUrlFailed, "API_PORT")
      );
    });
  });

  describe("isWellKnownName", () => {
    it("should return true for well-known result property names", () => {
      expect(Utils.isWellKnownName("result", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("r_e_s_u_l_t", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("r-e-s-u-l-t", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("data", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("items", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("root", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("matches", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("queries", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("list", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("output", ConstantString.WellknownResultNames)).to.be.true;
    });

    it("should return true for well-known result property names with different casing", () => {
      expect(Utils.isWellKnownName("Result", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("DaTa", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("ITEMS", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("Root", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("MaTcHeS", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("QuErIeS", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("LiSt", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("OutPut", ConstantString.WellknownResultNames)).to.be.true;
    });

    it("should return true for name substring is well-known result property names", () => {
      expect(Utils.isWellKnownName("testResult", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("carData", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("productItems", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("rootValue", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("matchesResult", ConstantString.WellknownResultNames)).to.be
        .true;
      expect(Utils.isWellKnownName("DataQueries", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("productLists", ConstantString.WellknownResultNames)).to.be.true;
      expect(Utils.isWellKnownName("outputData", ConstantString.WellknownResultNames)).to.be.true;
    });

    it("should return false for non well-known result property names", () => {
      expect(Utils.isWellKnownName("foo", ConstantString.WellknownResultNames)).to.be.false;
      expect(Utils.isWellKnownName("bar", ConstantString.WellknownResultNames)).to.be.false;
      expect(Utils.isWellKnownName("baz", ConstantString.WellknownResultNames)).to.be.false;
      expect(Utils.isWellKnownName("qux", ConstantString.WellknownResultNames)).to.be.false;
    });
  });

  describe("format", () => {
    it("should replace %s placeholders with arguments", () => {
      const result = Utils.format("Hello, %s!", "world");
      expect(result).to.equal("Hello, world!");
    });

    it("should handle multiple placeholders and arguments", () => {
      const result = Utils.format("The %s is %s.", "answer", "42");
      expect(result).to.equal("The answer is 42.");
    });

    it("should handle missing arguments", () => {
      const result = Utils.format("Hello, %s!", "");
      expect(result).to.equal("Hello, !");
    });

    it("should handle extra arguments", () => {
      const result = Utils.format("Hello, %s!", "world", "extra");
      expect(result).to.equal("Hello, world!");
    });

    it("should handle no placeholders", () => {
      const result = Utils.format("Hello, world!");
      expect(result).to.equal("Hello, world!");
    });
  });

  describe("getSafeRegistrationIdEnvName", () => {
    it("should return an empty string if authName is not provided", () => {
      expect(Utils.getSafeRegistrationIdEnvName("")).to.equal("");
    });

    it("should replace non-alphanumeric characters with underscores and convert to uppercase", () => {
      expect(Utils.getSafeRegistrationIdEnvName("auth@name")).to.equal("AUTH_NAME");
    });

    it('should prefix the result with "PREFIX_" if it does not start with an uppercase letter', () => {
      expect(Utils.getSafeRegistrationIdEnvName("1authname")).to.equal("PREFIX_1AUTHNAME");
    });

    it('should not prefix the result with "PREFIX_" if it starts with an uppercase letter', () => {
      expect(Utils.getSafeRegistrationIdEnvName("Authname")).to.equal("AUTHNAME");
    });

    it("should convert all lowercase letters to uppercase", () => {
      expect(Utils.getSafeRegistrationIdEnvName("authname")).to.equal("AUTHNAME");
    });
  });
});
