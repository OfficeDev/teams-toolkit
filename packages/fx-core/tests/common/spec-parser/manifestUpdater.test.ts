// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import path from "path";
import "mocha";
import { updateManifest, generateCommands } from "../../../src/common/spec-parser/manifestUpdater";

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
          parameters: [{ name: "limit", description: "Maximum number of pets to return" }],
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

    const originalManifest = {
      name: { short: "Original Name", full: "Original Full Name" },
      description: { short: "Original Short Description", full: "Original Full Description" },
      composeExtensions: [],
    };
    const expectedManifest = {
      name: { short: spec.info.title, full: spec.info.title },
      description: { short: spec.info.title, full: spec.info.description ?? "" },
      composeExtensions: [
        {
          type: "apiBased",
          supportsConversationalAI: true,
          apiSpecFile: "spec/outputSpec.yaml",
          commands: [
            {
              context: ["compose"],
              type: "query",
              title: "Get all pets",
              id: "getPets",
              parameters: [
                { name: "limit", title: "Limit", description: "Maximum number of pets to return" },
              ],
              apiResponseRenderingTemplate: "adaptiveCards/getPets.json",
            },
          ],
        },
      ],
    };
    const readJSONStub = sinon.stub(fs, "readJSON").resolves(originalManifest);

    const result = await updateManifest(manifestPath, outputSpecPath, adaptiveCardFolder, spec);

    expect(result).to.deep.equal(expectedManifest);
    readJSONStub.restore();
  });
});

describe("generateCommands", () => {
  const adaptiveCardFolder = "/path/to/your/adaptiveCards";
  const manifestPath = "/path/to/your/manifest.json";
  const spec: any = {
    paths: {
      "/pets": {
        get: {
          operationId: "getPets",
          summary: "Get all pets",
          parameters: [{ name: "limit", description: "Maximum number of pets to return" }],
        },
      },
      "/pets/{id}": {
        get: {
          operationId: "getPetById",
          summary: "Get a pet by ID",
          parameters: [{ name: "id", description: "ID of the pet to retrieve" }],
        },
      },
      "/owners/{ownerId}/pets": {
        get: {
          operationId: "getOwnerPets",
          summary: "Get all pets owned by an owner",
          parameters: [{ name: "ownerId", description: "ID of the owner" }],
        },
      },
    },
  };

  it("should generate commands for each GET operation in the spec", async () => {
    const expectedCommands = [
      {
        context: ["compose"],
        type: "query",
        title: "Get all pets",
        id: "getPets",
        parameters: [
          { name: "limit", title: "Limit", description: "Maximum number of pets to return" },
        ],
        apiResponseRenderingTemplate: "adaptiveCards/getPets.json",
      },
      {
        context: ["compose"],
        type: "query",
        title: "Get a pet by ID",
        id: "getPetById",
        parameters: [{ name: "id", title: "Id", description: "ID of the pet to retrieve" }],
        apiResponseRenderingTemplate: "adaptiveCards/getPetById.json",
      },
      {
        context: ["compose"],
        type: "query",
        title: "Get all pets owned by an owner",
        id: "getOwnerPets",
        parameters: [{ name: "ownerId", title: "OwnerId", description: "ID of the owner" }],
        apiResponseRenderingTemplate: "adaptiveCards/getOwnerPets.json",
      },
    ];

    const result = await generateCommands(spec, adaptiveCardFolder, manifestPath);

    expect(result).to.deep.equal(expectedCommands);
  });
});
