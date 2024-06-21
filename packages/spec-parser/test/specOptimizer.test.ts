// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { SpecOptimizer } from "../src/specOptimizer";

describe("specOptimizer.test", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should remove unused components, unused tags, user defined root property, unused security", () => {
    const spec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      "x-user-defined": {
        $ref: "#/components/schemas/Pet",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      tags: [
        {
          name: "user",
          description: "user operations",
        },
        {
          name: "pet",
          description: "pet operations",
        },
      ],
      security: [
        {
          api_key2: [],
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            tags: ["user"],
            security: [
              {
                api_key: [],
              },
            ],
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
        "/user/{name}": {
          get: {
            operationId: "getUserByName",
            parameters: [
              {
                name: "name",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
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
          api_key3: {
            type: "apiKey",
            name: "api_key3",
            in: "header",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Pet: {
            type: "string",
          },
          Order: {
            type: "string",
          },
        },
        responses: {
          "404NotFound": {
            description: "The specified resource was not found.",
          },
        },
      },
    };

    const expectedSpec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      tags: [
        {
          name: "user",
          description: "user operations",
        },
      ],
      security: [
        {
          api_key2: [],
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            tags: ["user"],
            operationId: "getUserById",
            security: [
              {
                api_key: [],
              },
            ],
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
        "/user/{name}": {
          get: {
            operationId: "getUserByName",
            parameters: [
              {
                name: "name",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
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
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Order: {
            type: "string",
          },
        },
      },
    };

    const result = SpecOptimizer.optimize(spec as any);
    expect(result).to.deep.equal(expectedSpec);
  });

  it("should maintain original spec when optimization is disabled", () => {
    const spec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      "x-user-defined": {
        $ref: "#/components/schemas/Pet",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      tags: [
        {
          name: "user",
          description: "user operations",
        },
        {
          name: "pet",
          description: "pet operations",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            tags: ["user"],
            security: [
              {
                api_key: [],
              },
            ],
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
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
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Pet: {
            type: "string",
          },
          Order: {
            type: "string",
          },
        },
        responses: {
          "404NotFound": {
            description: "The specified resource was not found.",
          },
        },
      },
    };

    const result = SpecOptimizer.optimize(spec as any, {
      removeUnusedComponents: false,
      removeUnusedTags: false,
      removeUserDefinedRootProperty: false,
      removeUnusedSecuritySchemas: false,
    });
    expect(result).to.deep.equal(spec);
  });

  it("should maintain original spec if no optimization can be performed", () => {
    const spec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      tags: [
        {
          name: "user",
          description: "user operations",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            tags: ["user"],
            security: [
              {
                api_key: [],
              },
            ],
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          api_key: {
            type: "apiKey",
            name: "api_key",
            in: "header",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Order: {
            type: "string",
          },
        },
      },
    };

    const result = SpecOptimizer.optimize(spec as any);
    expect(result).to.deep.equal(spec);
  });

  it("should remove securitySchemes if it empty after optimization", () => {
    const spec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          api_key: {
            type: "apiKey",
            name: "api_key",
            in: "header",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Order: {
            type: "string",
          },
        },
      },
    };

    const expectedSpec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Order: {
            type: "string",
          },
        },
      },
    };

    const result = SpecOptimizer.optimize(spec as any);
    expect(result).to.deep.equal(expectedSpec);
  });

  it("should remove components if it empty after optimization", () => {
    const spec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
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
      components: {
        securitySchemes: {
          api_key: {
            type: "apiKey",
            name: "api_key",
            in: "header",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Order: {
            type: "string",
          },
        },
      },
    };

    const expectedSpec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            operationId: "getUserById",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
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

    const result = SpecOptimizer.optimize(spec as any);
    expect(result).to.deep.equal(expectedSpec);
  });

  it("should works fine if matches unexpected component reference", () => {
    const spec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            operationId: "getUserById",
            description: "#/components/schemas/Unexpected/Reference/Pattern",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
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
      components: {
        securitySchemes: {
          api_key: {
            type: "apiKey",
            name: "api_key",
            in: "header",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              order: {
                $ref: "#/components/schemas/Order",
              },
            },
          },
          Order: {
            type: "string",
          },
        },
      },
    };

    const expectedSpec = {
      openapi: "3.0.2",
      info: {
        title: "User Service",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://server1",
        },
      ],
      paths: {
        "/user/{userId}": {
          get: {
            operationId: "getUserById",
            description: "#/components/schemas/Unexpected/Reference/Pattern",
            parameters: [
              {
                name: "userId",
                in: "path",
                required: true,
                schema: {
                  type: "string",
                },
              },
            ],
            responses: {
              "200": {
                description: "test",
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

    const result = SpecOptimizer.optimize(spec as any);
    expect(result).to.deep.equal(expectedSpec);
  });
});
