// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import "mocha";
import { SpecFilter } from "../src/specFilter";
import { OpenAPIV3 } from "openapi-types";
import sinon from "sinon";
import { SpecParserError } from "../src/specParserError";
import { ErrorType, ParseOptions, ProjectType } from "../src/interfaces";
import { ValidatorFactory } from "../src/validators/validatorFactory";

describe("specFilter", () => {
  afterEach(() => {
    sinon.restore();
  });
  const unResolveSpec: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "https://example.com",
      },
    ],
    paths: {
      "/hello": {
        get: {
          operationId: "getHello",
          summary: "Returns a greeting",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "A greeting message",
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
        post: {
          operationId: "postHello",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
            },
          ],
          summary: "Creates a greeting",
          responses: {
            "201": {
              description: "A greeting message",
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
        put: {
          operationId: "putHello",
          summary: "Updates a greeting",
          responses: {
            "200": {
              description: "A greeting message",
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

  it("should return a filtered OpenAPI spec", () => {
    const filter = ["get /hello", "post /hello"];
    const expectedSpec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello": {
          get: {
            operationId: "getHello",
            summary: "Returns a greeting",
            parameters: [
              {
                name: "query",
                in: "query",
                schema: { type: "string" },
              },
            ],
            responses: {
              "200": {
                description: "A greeting message",
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
          post: {
            operationId: "postHello",
            parameters: [
              {
                name: "query",
                in: "query",
                schema: { type: "string" },
              },
            ],
            responses: {
              "201": {
                content: {
                  "application/json": {
                    schema: {
                      type: "string",
                    },
                  },
                },
                description: "A greeting message",
              },
            },
            summary: "Creates a greeting",
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

    const actualSpec = SpecFilter.specFilter(filter, unResolveSpec, unResolveSpec, options);
    expect(actualSpec).to.deep.equal(expectedSpec);
  });

  it("should delete unsupported HTTP methods", () => {
    const filter = ["GET /hello", "PUT /hello"];
    const expectedSpec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello": {
          get: {
            operationId: "getHello",
            parameters: [
              {
                name: "query",
                in: "query",
                schema: { type: "string" },
              },
            ],
            summary: "Returns a greeting",
            responses: {
              "200": {
                description: "A greeting message",
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

    const actualSpec = SpecFilter.specFilter(filter, unResolveSpec, unResolveSpec, options);
    expect(actualSpec).to.deep.equal(expectedSpec);
  });

  it("should filter api if operationId is missing with allowMissingId is false", () => {
    const filter = ["get /hello/{id}"];
    const unResolvedSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello/{id}": {
          get: {
            parameters: [
              {
                in: "query",
                schema: { type: "string" },
                required: true,
              },
            ],
            responses: {
              "200": {
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
                description: "OK",
              },
            },
          },
        },
      },
    };
    const expectedSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {},
    };

    const options: ParseOptions = {
      allowMissingId: false,
      allowAPIKeyAuth: false,
      allowMultipleParameters: false,
      allowOauth2: false,
      projectType: ProjectType.SME,
      allowMethods: ["get", "post"],
    };

    const result = SpecFilter.specFilter(
      filter,
      unResolvedSpec as any,
      unResolvedSpec as any,
      options
    );

    expect(result).to.deep.equal(expectedSpec);
  });

  it("should add operationId if missing", () => {
    const filter = ["get /hello/{id}"];
    const unResolvedSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello/{id}": {
          get: {
            parameters: [
              {
                in: "query",
                schema: { type: "string" },
                required: true,
              },
            ],
            responses: {
              "200": {
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
                description: "OK",
              },
            },
          },
        },
      },
    };
    const expectedSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello/{id}": {
          get: {
            parameters: [
              {
                in: "query",
                schema: { type: "string" },
                required: true,
              },
            ],
            responses: {
              "200": {
                description: "OK",
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
            operationId: "getHelloId",
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

    const result = SpecFilter.specFilter(
      filter,
      unResolvedSpec as any,
      unResolvedSpec as any,
      options
    );

    expect(result).to.deep.equal(expectedSpec);
  });

  it("should not filter anything if filter item not exist", () => {
    const filter = ["get /hello"];
    const clonedSpec = { ...unResolveSpec };

    const options: ParseOptions = {
      allowMissingId: true,
      allowAPIKeyAuth: false,
      allowMultipleParameters: false,
      allowOauth2: false,
      projectType: ProjectType.SME,
      allowMethods: ["get", "post"],
    };

    SpecFilter.specFilter(filter, unResolveSpec, unResolveSpec, options);
    expect(clonedSpec).to.deep.equal(unResolveSpec);
  });

  it("should not filter anything if the filter item does not exist in the OpenAPI spec", () => {
    const filter = ["get /nonexistent"];
    const unResolvedSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello": {
          get: {
            responses: {
              "200": {
                description: "OK",
              },
            },
          },
        },
      },
    };

    const expectedSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
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

    const result = SpecFilter.specFilter(
      filter,
      unResolvedSpec as any,
      unResolvedSpec as any,
      options
    );

    expect(result).to.deep.equal(expectedSpec);
  });

  it("should not modify the original OpenAPI spec", () => {
    const filter = ["get /hello"];
    const clonedSpec = { ...unResolveSpec };

    const options: ParseOptions = {
      allowMissingId: true,
      allowAPIKeyAuth: false,
      allowMultipleParameters: false,
      allowOauth2: false,
      projectType: ProjectType.SME,
      allowMethods: ["get", "post"],
    };

    SpecFilter.specFilter(filter, unResolveSpec, unResolveSpec, options);
    expect(clonedSpec).to.deep.equal(unResolveSpec);
  });

  it("should throw a SpecParserError if ValidatorFactory throws an error", () => {
    const filter = ["GET /hello"];
    const unResolveSpec = {
      openapi: "3.0.0",
      servers: [
        {
          url: "https://example.com",
        },
      ],
      paths: {
        "/hello": {
          get: {
            responses: {
              "200": {
                description: "OK",
              },
            },
          },
        },
      },
    } as any;

    sinon.stub(ValidatorFactory, "create").throws(new Error("ValidatorFactory create error"));

    try {
      const options: ParseOptions = {
        allowMissingId: true,
        allowAPIKeyAuth: false,
        allowMultipleParameters: false,
        allowOauth2: false,
        projectType: ProjectType.SME,
        allowMethods: ["get", "post"],
      };

      SpecFilter.specFilter(filter, unResolveSpec, unResolveSpec, options);
      expect.fail("Expected specFilter to throw a SpecParserError");
    } catch (err: any) {
      expect(err).to.be.instanceOf(SpecParserError);
      expect(err.errorType).to.equal(ErrorType.FilterSpecFailed);
      expect(err.message).to.equal("Error: ValidatorFactory create error");
    }
  });
});
