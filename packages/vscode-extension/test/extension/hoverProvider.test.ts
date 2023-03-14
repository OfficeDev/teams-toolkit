// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as chai from "chai";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { v4 } from "uuid";
import { ProjectConfigV3, ok } from "@microsoft/teamsfx-api";
import { envUtil } from "@microsoft/teamsfx-core";
import * as commonTools from "@microsoft/teamsfx-core/build/common/tools";
import { ManifestTemplateHoverProvider } from "../../src/hoverProvider";
import { environmentVariableRegex } from "../../src/constants";
import { vscodeHelper } from "../../src/debug/depsChecker/vscodeHelper";
import * as handlers from "../../src/handlers";
import { MockCore } from "../mocks/mockCore";

describe("Manifest template hover", async () => {
  const text = `{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
    "manifestVersion": "1.14",
    "version": "1.0.0",
    "id": "{{state.fx-resource-appstudio.teamsAppId}}"
  }`;
  const document: vscode.TextDocument = {
    fileName: "manifest.template.json",
    getText: () => {
      return text;
    },
    lineAt: (line: number) => {
      const lines = text.split("\n");
      return {
        lineNumber: line,
        text: lines[line - 1],
      };
    },
    getWordRangeAtPosition: (position: vscode.Position, regex?: RegExp) => {
      return undefined;
    },
  } as any;

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
    sinon.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("hover - match", async () => {
    sinon.stub(commonTools, "isV3Enabled").returns(false);
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

    chai.assert.isTrue(hover === undefined);
  });
});

describe("Manifest template hover - V3", async () => {
  const text = `{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json",
    "manifestVersion": "1.14",
    "version": "1.0.0",
    "id": "\${{TEAMS_APP_ID}}"
  }`;
  const document: vscode.TextDocument = {
    fileName: "manifest.template.json",
    getText: () => {
      return text;
    },
    lineAt: (line: number) => {
      const lines = text.split("\n");
      return {
        lineNumber: line,
        text: lines[line - 1],
      };
    },
    getWordRangeAtPosition: (position: vscode.Position, regex?: RegExp) => {
      return undefined;
    },
  } as any;

  beforeEach(() => {
    sinon.stub(commonTools, "isV3Enabled").returns(true);
    sinon.stub(handlers, "core").value(new MockCore());
    sinon.stub(envUtil, "listEnv").resolves(ok(["local", "dev"]));
    sinon.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
  });

  afterEach(() => {
    sinon.restore();
    environmentVariableRegex.lastIndex = 0;
  });

  it("hover - match", async () => {
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        ["TEAMS_APP_ID"]: v4(),
      })
    );

    const hoverProvider = new ManifestTemplateHoverProvider();
    const position = new vscode.Position(5, 15);
    const cts = new vscode.CancellationTokenSource();
    const hover = await hoverProvider.provideHover(document, position, cts.token);

    chai.assert.isTrue(hover !== undefined);
    if (hover !== undefined) {
      chai.assert.isTrue(hover.contents.length > 0);
    }
  });

  it("hover - local", async () => {
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        ["TEAMS_APP_ID"]: v4(),
      })
    );

    const document: vscode.TextDocument = {
      fileName: "manifest.template.local.json",
      getText: () => {
        return text;
      },
      lineAt: (line: number) => {
        const lines = text.split("\n");
        return {
          lineNumber: line,
          text: lines[line - 1],
        };
      },
      getWordRangeAtPosition: (position: vscode.Position, regex?: RegExp) => {
        return undefined;
      },
    } as any;

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
    sinon.stub(envUtil, "readEnv").resolves(
      ok({
        ["TEAMS_APP_ID"]: v4(),
      })
    );

    const hoverProvider = new ManifestTemplateHoverProvider();
    const position = new vscode.Position(1, 1);
    const cts = new vscode.CancellationTokenSource();
    const hover = await hoverProvider.provideHover(document, position, cts.token);

    chai.assert.isTrue(hover === undefined);
  });

  it("hover - no value", async () => {
    sinon.stub(envUtil, "readEnv").resolves(ok({}));

    const hoverProvider = new ManifestTemplateHoverProvider();
    const position = new vscode.Position(5, 15);
    const cts = new vscode.CancellationTokenSource();
    const hover = await hoverProvider.provideHover(document, position, cts.token);

    chai.assert.isTrue(hover !== undefined);
    if (hover !== undefined) {
      chai.assert.isTrue(hover.contents.length > 0);
    }
  });
});
