// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { ProjectConfigV3, ok } from "@microsoft/teamsfx-api";
import { ManifestTemplateHoverProvider } from "../../src/hoverProvider";
import * as handlers from "../../src/handlers";
import { MockCore } from "../mocks/mockCore";

describe("Manifest template hover", async () => {
  const document = <vscode.TextDocument>{
    fileName: "manifest.template.json",
    getText: () => {
      return `{
                "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
                "manifestVersion": "1.14",
                "version": "1.0.0",
                "id": "{{state.fx-resource-appstudio.teamsAppId}}"
            }`;
    },
  };

  const config: ProjectConfigV3 = {
    projectSettings: {
      appName: "myapp",
      version: "1.0.0",
      projectId: "123",
    },
    envInfos: {
      ["local"]: {
        envName: "local",
        state: {
          ["solution"]: {},
          ["fx-resource-appstudio"]: {
            teamsAppId: "fakeId",
          },
        },
        config: {},
      },
    },
  };

  beforeEach(() => {
    sinon.stub(handlers, "core").value(new MockCore());
    sinon.stub(MockCore.prototype, "getProjectConfigV3").resolves(ok(config));
  });

  afterEach(() => {
    sinon.restore();
  });

  it("hover - match", async () => {
    const hoverProvider = new ManifestTemplateHoverProvider();
    const position = new vscode.Position(5, 15);
    const cts = new vscode.CancellationTokenSource();
    const hover = await hoverProvider.provideHover(document, position, cts.token);

    chai.assert.isTrue(hover !== undefined);
    if (hover !== undefined) {
      chai.assert.isTrue(hover.contents.length > 0);
    }
  });

  it("hover-undefined", async () => {
    const hoverProvider = new ManifestTemplateHoverProvider();
    const position = new vscode.Position(1, 1);
    const cts = new vscode.CancellationTokenSource();
    const hover = await hoverProvider.provideHover(document, position, cts.token);

    chai.assert.isTrue(hover !== undefined);
    if (hover !== undefined) {
      chai.assert.isTrue(hover.contents.length > 0);
    }
  });
});
