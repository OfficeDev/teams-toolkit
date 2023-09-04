// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import "mocha";
import { updateManifest, generateCommands } from "../../../src/common/spec-parser/manifestUpdater";
import { SpecParserError } from "../../../src/common/spec-parser/specParserError";
import { ErrorType, WarningType } from "../../../src/common/spec-parser/interfaces";
import { ConstantString } from "../../../src/common/spec-parser/constants";
import { format } from "util";

describe("manifestUpdater", () => {
  const spec: any = {
    openapi: "3.0.2",
    info: {
      title: "My API",
      description: "My API description",
    },
    servers: [
      {
        url: "/v3",
      },
    ],
    paths: {
      "/pets": {
        get: {
          operationId: "getPets",
          summary: "Get all pets",
          parameters: [
            { name: "limit", description: "Maximum number of pets to return", required: true },
          ],
        },
        post: {
          operationId: "createPet",
          summary: "Create a pet",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the pet",
                      required: true,
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

  afterEach(() => {
    sinon.restore();
  });

  it("should update the manifest with the correct compose extension", async () => {
    const manifestPath = "/path/to/your/manifest.json";
    const outputSpecPath = "/path/to/your/spec/outputSpec.yaml";
    const adaptiveCardFolder = "/path/to/your/adaptiveCards";
    sinon.stub(fs, "pathExists").resolves(true);
    const originalManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: "Original Short Description", full: "Original Full Description" },
      composeExtensions: [],
    };
    const expectedManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: spec.info.title, full: spec.info.description },
      composeExtensions: [
        {
          composeExtensionType: "apiBased",
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              id: "getPets",
              parameters: [
                { name: "limit", title: "Limit", description: "Maximum number of pets to return" },
              ],
              apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
            },
            {
              context: ["compose"],
              type: "query",
              title: "Create a pet",
              id: "createPet",
              parameters: [{ name: "name", title: "Name", description: "Name of the pet" }],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should return warnings if api only contain optional parameters", async () => {
    const manifestPath = "/path/to/your/manifest.json";
    const outputSpecPath = "/path/to/your/spec/outputSpec.yaml";
    const adaptiveCardFolder = "/path/to/your/adaptiveCards";
    const spec: any = {
      openapi: "3.0.2",
      info: {
        title: "My API",
        description: "My API description",
      },
      servers: [
        {
          url: "/v3",
        },
      ],
      paths: {
        "/pets": {
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the pet",
                        required: false,
                      },
                      id: {
                        type: "string",
                        description: "Id of the pet",
                        required: false,
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
    sinon.stub(fs, "pathExists").resolves(true);
    const originalManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: "Original Short Description", full: "Original Full Description" },
      composeExtensions: [],
    };
    const expectedManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: spec.info.title, full: spec.info.description },
      composeExtensions: [
        {
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [],
          composeExtensionType: "apiBased",
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: format(ConstantString.OperationOnlyContainsOptionalParam, "createPet"),
        data: "createPet",
      },
    ]);
  });

  it("should throw a SpecParserError if fs.readJSON throws an error", async () => {
    const manifestPath = "path/to/manifest.json";
    const outputSpecPath = "path/to/outputSpec.json";
    const adaptiveCardFolder = "path/to/adaptiveCardFolder";
    const spec = {} as any;
    const readJSONStub = sinon.stub(fs, "readJSON").rejects(new Error("readJSON error"));
    try {
      await updateManifest(manifestPath, outputSpecPath, adaptiveCardFolder, spec);
      expect.fail("Expected updateManifest to throw a SpecParserError");
    } catch (err) {
      expect(err).to.be.instanceOf(SpecParserError);
      expect(err.errorType).to.equal(ErrorType.UpdateManifestFailed);
      expect(err.message).to.equal("Error: readJSON error");
    }
  });

  it("should skip updating commands if adaptive card not exist", async () => {
    const manifestPath = "/path/to/your/manifest.json";
    const outputSpecPath = "/path/to/your/spec/outputSpec.yaml";
    const adaptiveCardFolder = "/path/to/your/adaptiveCards";
    sinon.stub(fs, "pathExists").resolves(false);

    const originalManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: "Original Short Description", full: "Original Full Description" },
      composeExtensions: [],
    };
    const expectedManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: spec.info.title, full: "Original Full Description" },
      composeExtensions: [
        {
          composeExtensionType: "apiBased",
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [
            {
              apiResponseRenderingTemplateFile: "",
              context: ["compose"],
              id: "getPets",
              parameters: [
                {
                  description: "Maximum number of pets to return",
                  name: "limit",
                  title: "Limit",
                },
              ],
              title: "Get all pets",
              type: "query",
            },
            {
              apiResponseRenderingTemplateFile: "",
              context: ["compose"],
              id: "createPet",
              parameters: [
                {
                  description: "Name of the pet",
                  name: "name",
                  title: "Name",
                },
              ],
              title: "Create a pet",
              type: "query",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      {
        ...spec,
        info: { title: "My API" },
      }
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
    readJSONStub.restore();
  });

  it("should skip updating full/description if missing info/description", async () => {
    const manifestPath = "/path/to/your/manifest.json";
    const outputSpecPath = "/path/to/your/spec/outputSpec.yaml";
    const adaptiveCardFolder = "/path/to/your/adaptiveCards";
    sinon.stub(fs, "pathExists").resolves(true);

    const originalManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: "Original Short Description", full: "Original Full Description" },
      composeExtensions: [],
    };
    const expectedManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: spec.info.title, full: "Original Full Description" },
      composeExtensions: [
        {
          composeExtensionType: "apiBased",
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              id: "getPets",
              parameters: [
                { name: "limit", title: "Limit", description: "Maximum number of pets to return" },
              ],
              apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
            },
            {
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
              context: ["compose"],
              id: "createPet",
              parameters: [
                {
                  description: "Name of the pet",
                  name: "name",
                  title: "Name",
                },
              ],
              title: "Create a pet",
              type: "query",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      {
        ...spec,
        info: { title: "My API" },
      }
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
    readJSONStub.restore();
  });
});

describe("generateCommands", () => {
  const adaptiveCardFolder = "/path/to/your/adaptiveCards";
  const manifestPath = "/path/to/your/manifest.json";

  afterEach(() => {
    sinon.restore();
  });

  it("should generate commands for each GET/POST operation in the spec", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            parameters: [
              { name: "limit", description: "Maximum number of pets to return", required: true },
            ],
          },
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            parameters: [{ name: "id", description: "ID of the pet", required: false }],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the pet",
                        required: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "/pets/{id}": {
          get: {
            operationId: "getPetById",
            summary: "Get a pet by ID",
            parameters: [{ name: "id", description: "ID of the pet to retrieve", required: true }],
          },
        },
        "/owners/{ownerId}/pets": {
          get: {
            operationId: "getOwnerPets",
            summary: "Get all pets owned by an owner",
            parameters: [{ name: "ownerId", description: "ID of the owner", required: true }],
          },
        },
      },
    };
    sinon.stub(fs, "pathExists").resolves(true);

    const expectedCommands = [
      {
        context: ["compose"],
        type: "query",
        title: "Get all pets",
        id: "getPets",
        parameters: [
          { name: "limit", title: "Limit", description: "Maximum number of pets to return" },
        ],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
      },
      {
        context: ["compose"],
        type: "query",
        title: "Create a pet",
        id: "createPet",
        parameters: [
          {
            description: "Name of the pet",
            name: "name",
            title: "Name",
          },
        ],
        apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
      },
      {
        context: ["compose"],
        type: "query",
        title: "Get a pet by ID",
        id: "getPetById",
        parameters: [{ name: "id", title: "Id", description: "ID of the pet to retrieve" }],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPetById.json",
      },
      {
        context: ["compose"],
        type: "query",
        title: "Get all pets owned by an owner",
        id: "getOwnerPets",
        parameters: [{ name: "ownerId", title: "OwnerId", description: "ID of the owner" }],
        apiResponseRenderingTemplateFile: "adaptiveCards/getOwnerPets.json",
      },
    ];

    const [result, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });

  it("should throw error for each GET/POST operation in the spec if only contains optional parameters", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            parameters: [
              { name: "limit", description: "Maximum number of pets to return", required: false },
              { name: "id", description: "ID of the pet", required: false },
            ],
          },
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            parameters: [{ name: "id", description: "ID of the pet", required: false }],
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the pet",
                        required: false,
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
    sinon.stub(fs, "pathExists").resolves(true);

    const [result, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);
    expect(result).to.deep.equal([]);
    expect(warnings).to.deep.equal([
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: format(ConstantString.OperationOnlyContainsOptionalParam, "getPets"),
        data: "getPets",
      },
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: format(ConstantString.OperationOnlyContainsOptionalParam, "createPet"),
        data: "createPet",
      },
    ]);
  });

  it("should only generate commands for GET operation with required parameter", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            parameters: [
              { name: "limit", description: "Maximum number of pets to return", required: false },
              { name: "id", description: "ID of the pet", required: true },
            ],
          },
        },
      },
    };
    sinon.stub(fs, "pathExists").resolves(true);

    const expectedCommands = [
      {
        context: ["compose"],
        type: "query",
        title: "Get all pets",
        id: "getPets",
        parameters: [{ name: "id", title: "Id", description: "ID of the pet" }],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
      },
    ];

    const [result, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });

  it("should generate commands for POST operation with string schema", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "string",
                    description: "Name of the pet",
                    required: true,
                  },
                },
              },
            },
          },
        },
      },
    };
    sinon.stub(fs, "pathExists").resolves(true);

    const expectedCommands = [
      {
        context: ["compose"],
        type: "query",
        title: "Create a pet",
        id: "createPet",
        parameters: [
          {
            description: "Name of the pet",
            name: "requestBody",
            title: "RequestBody",
          },
        ],
        apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
      },
    ];

    const [result, warnings] = await generateCommands(spec, adaptiveCardFolder, manifestPath);

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });
});
