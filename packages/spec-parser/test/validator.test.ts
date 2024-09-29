// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, expect } from "chai";
import "mocha";
import { ErrorType, ProjectType, ParseOptions } from "../src/interfaces";
import { ValidatorFactory } from "../src/validators/validatorFactory";
import { SMEValidator } from "../src/validators/smeValidator";
import { CopilotValidator } from "../src/validators/copilotValidator";
import { TeamsAIValidator } from "../src/validators/teamsAIValidator";

describe("Validator", () => {
  describe("ValidatorFactory", () => {
    it("should create validator correctly", () => {
      const options: ParseOptions = {
        projectType: undefined,
      };

      let validator = ValidatorFactory.create({} as any, options);
      assert.instanceOf(validator, SMEValidator);

      options.projectType = ProjectType.SME;
      validator = ValidatorFactory.create({} as any, options);
      assert.instanceOf(validator, SMEValidator);

      options.projectType = ProjectType.Copilot;

      validator = ValidatorFactory.create({} as any, options);
      assert.instanceOf(validator, CopilotValidator);

      options.projectType = ProjectType.TeamsAi;
      validator = ValidatorFactory.create({} as any, options);
      assert.instanceOf(validator, TeamsAIValidator);
    });

    it("should throw error if project type is unknown", () => {
      const options: ParseOptions = {
        projectType: "test" as any,
      };

      assert.throws(
        () => {
          ValidatorFactory.create({} as any, options);
        },
        Error,
        "Invalid project type: test"
      );
    });
  });
  describe("SMEValidator", () => {
    it("should return true if method is GET, path is valid, and parameter is supported", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if have no operationId with allowMissingId is false", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.MissingOperationId]);
    });

    it("should return true if method is POST, path is valid, and no required parameters", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if method is POST, path is valid, parameter is supported and only one required param in parameters but contains auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.AuthTypeIsNotSupported]);
    });

    it("should return true if allowBearerTokenAuth is true and contains bearer token auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
      } as any;

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowBearerTokenAuth: true,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if allowAPIKeyAuth is true and contains apiKey auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
      } as any;

      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: true,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if allowAPIKeyAuth is true but contains multiple apiKey auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.MultipleAuthNotSupported]);
    });

    it("should return true if allowOauth2 is true and contains aad auth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
      } as any;
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: true,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if allowAPIKeyAuth is true, allowOauth2 is false, but contain oauth", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.AuthTypeIsNotSupported]);
    });

    it("should return false if allowAPIKeyAuth is true, allowOauth2 is true, but not auth code flow", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.AuthTypeIsNotSupported]);
    });

    it("should return true if method is POST, path is valid, parameter is supported and only one required param in parameters", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if method is POST, path is valid, parameter is supported and both postBody and parameters contains required param", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.ExceededRequiredParamsLimit]);
    });

    it("should support multiple required parameters", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should not support multiple required parameters count larger than 5", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.ExceededRequiredParamsLimit]);
    });

    it("should return false if method is POST, but requestBody contains unsupported parameter and required", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.PostBodyContainsRequiredUnsupportedSchema]);
    });

    it("should return true if method is POST, but requestBody contains unsupported parameter and required but has default value", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if method is POST, path is valid, parameter is supported and only one required param in postBody", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if method is GET, path is valid, parameter is supported, but response is empty", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.ResponseJsonIsEmpty]);
    });

    it("should return false if method is not GET or POST", () => {
      const method = "PUT";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.MethodNotAllowed]);
    });

    it("should return false if path is not valid", () => {
      const method = "GET";
      const path = "/invalid";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.UrlPathNotExist]);
    });

    it("should return false if parameter is not supported and required", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.ParamsContainRequiredUnsupportedSchema]);
    });

    it("should return false due to ignore unsupported schema type with default value", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.NoParameter]);
    });

    it("should return false if parameter is in header and required", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.ParamsContainRequiredUnsupportedSchema]);
    });

    it("should return false if there is no parameters", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.NoParameter]);
    });

    it("should return false if parameters is null", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.NoParameter]);
    });

    it("should return false if has parameters but no 20X response", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);

      // NoParameter because object is not supported and there is no required parameters
      expect(reason).to.have.members([ErrorType.NoParameter, ErrorType.ResponseJsonIsEmpty]);
      expect(reason.length).equals(2);
    });

    it("should return false if method is POST, but request body contains media type other than application/json", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [
        ErrorType.PostBodyContainMultipleMediaTypes,
        ErrorType.ExceededRequiredParamsLimit,
      ]);
    });

    it("should return false if method is GET, but response body contains media type other than application/json", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.ResponseContainMultipleMediaTypes]);
    });

    it("should return false if contain circular reference", () => {
      const method = "POST";
      const path = "/users";
      const circularSchema = {
        type: "object",
        properties: {
          item: {},
        },
      };

      circularSchema.properties.item = circularSchema;
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
        paths: {
          "/users": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: circularSchema,
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.CircularReferenceNotSupported]);
    });
  });

  describe("CopilotValidator", () => {
    it("should return true if method is POST, path is valid, parameter is supported and both postBody and parameters contains multiple required param for copilot", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if method is POST, and request body schema is not object", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.PostBodySchemaIsNotJson]);
    });

    it("should return true if method is POST, and request body schema type is undefined but contains properties", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
        paths: {
          "/users": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
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
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if there is no parameters for copilot", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true response body is empty", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
        paths: {
          "/users": {
            get: {
              parameters: [],
              responses: {
                "201": {
                  description: "A successful response indicating that the repair was created",
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if request body/response body contains multiple media types", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
        projectType: ProjectType.Copilot,
        allowMethods: ["get", "post"],
      };
      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if parameter is in header and required for copilot", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should support multiple required parameters count larger than 5 for copilot", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if method is POST, parameters contain nested object, and request body is not json", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      expect(reason).to.have.members([
        ErrorType.ParamsContainsNestedObject,
        ErrorType.PostBodySchemaIsNotJson,
      ]);
      expect(reason.length).equals(2);
    });

    it("should return false if method is POST, but requestBody contain nested object", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.RequestBodyContainsNestedObject]);
    });

    it("should return false if method is POST, but requestBody contain nested object with undefined type", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
                      required: ["name"],
                      properties: {
                        name: {
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.RequestBodyContainsNestedObject]);
    });

    it("should return false if contain circular reference", () => {
      const method = "POST";
      const path = "/users";
      const circularSchema = {
        type: "object",
        properties: {
          item: {},
        },
      };

      circularSchema.properties.item = circularSchema;
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
        paths: {
          "/users": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: circularSchema,
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.CircularReferenceNotSupported]);
    });
  });

  describe("TeamsAIValidator", () => {
    it("should return true if allowAPIKeyAuth is true, allowOauth2 is true, but not auth code flow for teams ai project", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should support multiple required parameters count larger than 5 for teams ai project", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if method is POST, and request body contains media type other than application/json for teams ai project", () => {
      const method = "POST";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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
      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return true if method is GET, and response body contains media type other than application/json for teams ai project", () => {
      const method = "GET";
      const path = "/users";
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, true);
    });

    it("should return false if contain circular reference", () => {
      const method = "POST";
      const path = "/users";
      const circularSchema = {
        type: "object",
        properties: {
          item: {},
        },
      };

      circularSchema.properties.item = circularSchema;
      const spec = {
        servers: [
          {
            url: "https://example.com",
          },
        ],
        paths: {
          "/users": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: circularSchema,
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

      const validator = ValidatorFactory.create(spec as any, options);
      const { isValid, reason } = validator.validateAPI(method, path);
      assert.strictEqual(isValid, false);
      assert.deepEqual(reason, [ErrorType.CircularReferenceNotSupported]);
    });
  });
});
