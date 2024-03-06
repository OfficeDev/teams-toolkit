// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import os from "os";
import "mocha";
import { ManifestUpdater } from "../src/manifestUpdater";
import { SpecParserError } from "../src/specParserError";
import { ErrorType, WarningType } from "../src/interfaces";
import { ConstantString } from "../src/constants";
import { Utils } from "../src/utils";

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
          description: "Returns all pets from the system that the user has access to",
          parameters: [
            { name: "limit", description: "Maximum number of pets to return", required: true },
          ],
        },
        post: {
          operationId: "createPet",
          summary: "Create a pet",
          description: "Create a new pet in the store",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the pet",
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
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
              id: "createPet",
              parameters: [{ name: "name", title: "Name", description: "Name of the pet" }],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should support multiple parameters for get", async () => {
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
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            description: "Returns all pets from the system that the user has access to",
            parameters: [
              {
                name: "limit",
                description: "Maximum number of pets to return",
                required: true,
                schema: {
                  type: "number",
                },
              },
              {
                name: "name",
                description: "Pet Name",
                required: true,
                schema: {
                  type: "string",
                },
              },
              {
                name: "id",
                description: "Pet Id",
                required: true,
                schema: {
                  type: "integer",
                },
              },
              {
                name: "other1",
                description: "Other Property1",
                required: true,
                schema: {
                  type: "boolean",
                },
              },
              {
                name: "other2",
                description: "Other Property2",
                required: true,
                schema: {
                  type: "string",
                  enum: ["enum1", "enum2", "enum3", "enum4"],
                },
              },
            ],
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
          composeExtensionType: "apiBased",
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              description: "Returns all pets from the system that the user has access to",
              id: "getPets",
              parameters: [
                {
                  name: "limit",
                  title: "Limit",
                  description: "Maximum number of pets to return",
                  inputType: "number",
                },
                { name: "name", title: "Name", description: "Pet Name", inputType: "text" },
                {
                  name: "id",
                  title: "Id",
                  description: "Pet Id",
                  inputType: "number",
                },
                {
                  name: "other1",
                  title: "Other1",
                  description: "Other Property1",
                  inputType: "toggle",
                },
                {
                  name: "other2",
                  title: "Other2",
                  description: "Other Property2",
                  inputType: "choiceset",
                  choices: [
                    {
                      title: "enum1",
                      value: "enum1",
                    },
                    {
                      title: "enum2",
                      value: "enum2",
                    },
                    {
                      title: "enum3",
                      value: "enum3",
                    },
                    {
                      title: "enum4",
                      value: "enum4",
                    },
                  ],
                },
              ],
              apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      true
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should support multiple parameters for post", async () => {
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
            summary: "Create Pet",
            description: "Create Pet by Id",
            requestBody: {
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: {
                        type: "string",
                        description: "Pet Name",
                      },
                    },
                  },
                },
              },
            },
            parameters: [
              {
                name: "id",
                description: "Pet Id",
                required: true,
                schema: {
                  type: "integer",
                },
              },
            ],
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
          composeExtensionType: "apiBased",
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Create Pet",
              description: "Create Pet by Id",
              id: "createPet",
              parameters: [
                {
                  name: "id",
                  title: "Id",
                  description: "Pet Id",
                  inputType: "number",
                },
                { name: "name", title: "Name", description: "Pet Name", inputType: "text" },
              ],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      true
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should support default value when allowMultipleParameter is true", async () => {
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
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            description: "Returns all pets from the system that the user has access to",
            parameters: [
              {
                name: "id",
                description: "Pet Id",
                required: true,
                schema: {
                  type: "integer",
                  default: 123,
                },
              },
            ],
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
          composeExtensionType: "apiBased",
          apiSpecificationFile: "spec/outputSpec.yaml",
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              description: "Returns all pets from the system that the user has access to",
              id: "getPets",
              parameters: [
                {
                  name: "id",
                  title: "Id",
                  description: "Pet Id",
                  inputType: "number",
                  value: 123,
                },
              ],
              apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      true
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should contain auth property in manifest if pass the api key auth", async () => {
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
          authorization: {
            authType: "apiSecretServiceAuth",
            apiSecretServiceAuthConfiguration: {
              apiSecretRegistrationId: "${{API_KEY_NAME_REGISTRATION_ID}}",
            },
          },
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
              id: "createPet",
              parameters: [{ name: "name", title: "Name", description: "Name of the pet" }],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);
    const apiKeyAuth = {
      type: "apiKey" as const,
      name: "api_key_name",
      in: "header",
    };
    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false,
      apiKeyAuth
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should contain auth property in manifest if pass the sso auth", async () => {
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
          authorization: {
            authType: "microsoftEntra",
            microsoftEntraConfiguration: {
              supportsSingleSignOn: true,
            },
          },
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
              id: "createPet",
              parameters: [{ name: "name", title: "Name", description: "Name of the pet" }],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
      webApplicationInfo: {
        id: "${{AAD_APP_CLIENT_ID}}",
        resource: "api://${{DOMAIN}}/${{AAD_APP_CLIENT_ID}}",
      },
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);
    const oauth2 = {
      type: "oauth2" as const,
      flows: {
        implicit: {
          authorizationUrl: "https://example.com/api/oauth/dialog",
          scopes: {
            "write:pets": "modify pets in your account",
            "read:pets": "read your pets",
          },
        },
      },
    };
    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false,
      oauth2
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should not contain auth property in manifest if pass the unknown auth", async () => {
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
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
              id: "createPet",
              parameters: [{ name: "name", title: "Name", description: "Name of the pet" }],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);
    const basicAuth = {
      type: "http" as const,
      scheme: "basic",
    };
    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false,
      basicAuth
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });

  it("should contain auth property in manifest if pass the api key name with special characters", async () => {
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
          authorization: {
            authType: "apiSecretServiceAuth",
            apiSecretServiceAuthConfiguration: {
              apiSecretRegistrationId: "${{PREFIX__API_KEY_NAME_REGISTRATION_ID}}",
            },
          },
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
              id: "createPet",
              parameters: [{ name: "name", title: "Name", description: "Name of the pet" }],
              apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);
    const apiKeyAuth = {
      type: "apiKey" as const,
      name: "*api-key_name",
      in: "header",
    };
    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false,
      apiKeyAuth
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
                      },
                      id: {
                        type: "string",
                        description: "Id of the pet",
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
          commands: [
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
              description: "",
              type: "query",
            },
          ],
          composeExtensionType: "apiBased",
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: Utils.format(ConstantString.OperationOnlyContainsOptionalParam, "createPet"),
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
      await ManifestUpdater.updateManifest(
        manifestPath,
        outputSpecPath,
        adaptiveCardFolder,
        spec,
        false
      );
      expect.fail("Expected updateManifest to throw a SpecParserError");
    } catch (err: any) {
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
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
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

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      {
        ...spec,
        info: { title: "My API" },
      },
      false
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
              description: "Returns all pets from the system that the user has access to",
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
              description: "Create a new pet in the store",
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

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      {
        ...spec,
        info: { title: "My API" },
      },
      false
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
    readJSONStub.restore();
  });

  it("should not update manifest if is not me", async () => {
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
      composeExtensions: [],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const [result, warnings] = await ManifestUpdater.updateManifest(
      manifestPath,
      outputSpecPath,
      adaptiveCardFolder,
      spec,
      false,
      undefined,
      false
    );

    expect(result).to.deep.equal(expectedManifest);
    expect(warnings).to.deep.equal([]);
  });
});

describe("getRelativePath", () => {
  it("should return the correct relative path", () => {
    const from = "/path/to/from";
    const to = "/path/to/file.txt";
    const result = ManifestUpdater.getRelativePath(from, to);
    expect(result).to.equal("file.txt");
  });

  it("should get relative path with subfolder", () => {
    const from = "/path/to/from";
    const to = "/path/to/subfolder/file.txt";
    const result = ManifestUpdater.getRelativePath(from, to);
    expect(result).to.equal("subfolder/file.txt");
  });

  it("should replace backslashes with forward slashes on Windows", () => {
    if (os.platform() === "win32") {
      const from = "c:\\path\\to\\from";
      const to = "c:\\path\\to\\subfolder\\file.txt";
      const result = ManifestUpdater.getRelativePath(from, to);
      expect(result).to.equal("subfolder/file.txt");
    }
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
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the pet",
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
        description: "",
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
        description: "",
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
        description: "",
        id: "getPetById",
        parameters: [{ name: "id", title: "Id", description: "ID of the pet to retrieve" }],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPetById.json",
      },
      {
        context: ["compose"],
        type: "query",
        description: "",
        title: "Get all pets owned by an owner",
        id: "getOwnerPets",
        parameters: [{ name: "ownerId", title: "OwnerId", description: "ID of the owner" }],
        apiResponseRenderingTemplateFile: "adaptiveCards/getOwnerPets.json",
      },
    ];

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });

  it("should truncate strings in manifest file if exceed the max lens", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          get: {
            operationId: "getPets",
            summary:
              "Get all pets. Get all pets. Get all pets. Get all pets. Get all pets. Get all pets.",
            description:
              "This is the long description of get all pets. This is the long description of get all pets. This is the long description of get all pets",
            parameters: [
              {
                name: "longLimitlongLimitlongLimitlongLimit",
                description:
                  "Long maximum number of pets to return. Long maximum number of pets to return. Long maximum number of pets to return. Long maximum number of pets to return.",
                required: true,
              },
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
        title: "Get all pets. Get all pets. Get ",
        id: "getPets",
        description:
          "This is the long description of get all pets. This is the long description of get all pets. This is the long description of get ",
        parameters: [
          {
            name: "longLimitlongLimitlongLimitlongLimit",
            title: "LongLimitlongLimitlongLimitlongL",
            description:
              "Long maximum number of pets to return. Long maximum number of pets to return. Long maximum number of pets to return. Long maximu",
          },
        ],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
      },
    ];

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });

  it("should show warning for each GET/POST operation in the spec if only contains optional parameters", async () => {
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

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );
    expect(result).to.deep.equal([
      {
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
        context: ["compose"],
        id: "getPets",
        description: "",
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
        apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
        context: ["compose"],
        id: "createPet",
        description: "",
        parameters: [
          {
            description: "ID of the pet",
            name: "id",
            title: "Id",
          },
        ],
        title: "Create a pet",
        type: "query",
      },
    ]);
    expect(warnings).to.deep.equal([
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: Utils.format(ConstantString.OperationOnlyContainsOptionalParam, "getPets"),
        data: "getPets",
      },
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: Utils.format(ConstantString.OperationOnlyContainsOptionalParam, "createPet"),
        data: "createPet",
      },
    ]);
  });

  it("should treat POST operation required parameter with default value as optional parameter", async () => {
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
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: {
                        type: "string",
                        description: "Name of the pet",
                        default: "value",
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

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );
    expect(result).to.deep.equal([
      {
        apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
        context: ["compose"],
        id: "createPet",
        description: "",
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
    ]);
    expect(warnings).to.deep.equal([]);
  });

  it("should not show warning for each GET/POST operation in the spec if only contains 1 optional parameters", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            parameters: [{ name: "id", description: "ID of the pet", required: false }],
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

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );
    expect(result).to.deep.equal([
      {
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
        context: ["compose"],
        id: "getPets",
        description: "",
        parameters: [
          {
            description: "ID of the pet",
            name: "id",
            title: "Id",
          },
        ],
        title: "Get all pets",
        type: "query",
      },
      {
        apiResponseRenderingTemplateFile: "adaptiveCards/createPet.json",
        context: ["compose"],
        id: "createPet",
        description: "",
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
    ]);
    expect(warnings).to.deep.equal([]);
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
        description: "",
        id: "getPets",
        parameters: [{ name: "id", title: "Id", description: "ID of the pet" }],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
      },
    ];

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });

  it("should treat required parameter with default value as optional parameter", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          get: {
            operationId: "getPets",
            summary: "Get all pets",
            parameters: [
              {
                name: "limit",
                in: "query",
                description: "Maximum number of pets to return",
                required: false,
              },
              {
                name: "id",
                in: "query",
                description: "ID of the pet",
                required: true,
                schema: {
                  type: "string",
                  default: "value",
                },
              },
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
        description: "",
        title: "Get all pets",
        id: "getPets",
        parameters: [
          { name: "limit", title: "Limit", description: "Maximum number of pets to return" },
        ],
        apiResponseRenderingTemplateFile: "adaptiveCards/getPets.json",
      },
    ];

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([
      {
        type: WarningType.OperationOnlyContainsOptionalParam,
        content: Utils.format(ConstantString.OperationOnlyContainsOptionalParam, "getPets"),
        data: "getPets",
      },
    ]);
  });

  it("should generate commands for POST operation with string schema", async () => {
    const spec: any = {
      paths: {
        "/pets": {
          post: {
            operationId: "createPet",
            summary: "Create a pet",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "string",
                    description: "Name of the pet",
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
        description: "",
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

    const [result, warnings] = await ManifestUpdater.generateCommands(
      spec,
      adaptiveCardFolder,
      manifestPath,
      false
    );

    expect(result).to.deep.equal(expectedCommands);
    expect(warnings).to.deep.equal([]);
  });
});
