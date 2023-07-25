import * as chai from "chai";
import * as sinon from "sinon";
import { envUtil } from "@microsoft/teamsfx-core";
import { ok } from "@microsoft/teamsfx-api";
import {
  AadAppTemplateCodeLensProvider,
  CopilotPluginCodeLensProvider,
  CryptoCodeLensProvider,
  ManifestTemplateCodeLensProvider,
  PlaceholderCodeLens,
  TeamsAppYamlCodeLensProvider,
} from "../../src/codeLensProvider";
import * as vscode from "vscode";
import * as globalVariables from "../../src/globalVariables";
import { TelemetryTriggerFrom } from "../../src/telemetry/extTelemetryEvents";

describe("Manifest codelens", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("Template codelens - V3", async () => {
    const url =
      "https://developer.microsoft.com/en-us/json-schemas/teams/v1.14/MicrosoftTeams.schema.json";
    const document = {
      fileName: "manifest.template.json",
      getText: () => {
        return `"$schema": "${url}",`;
      },
      positionAt: () => {
        return new vscode.Position(0, 0);
      },
      lineAt: () => {
        return {
          lineNumber: 0,
          text: `"$schema": "${url}",`,
        };
      },
    } as any as vscode.TextDocument;

    const manifestProvider = new ManifestTemplateCodeLensProvider();
    const codelens: vscode.CodeLens[] = manifestProvider.provideCodeLenses(
      document
    ) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 1);
    chai.expect(codelens[0].command).to.deep.equal({
      title: "Open schema",
      command: "fx-extension.openSchema",
      arguments: [{ url: url }],
    });
  });

  it("ResolveEnvironmentVariableCodelens", async () => {
    sinon.stub(envUtil, "readEnv").resolves(ok({}));

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
    const lens: PlaceholderCodeLens = new PlaceholderCodeLens(
      "${{ TEAMS_APP_ID }}",
      range,
      "manifest.template.json"
    );
    const manifestProvider = new ManifestTemplateCodeLensProvider();
    const cts = new vscode.CancellationTokenSource();

    const res = await manifestProvider.resolveCodeLens(lens, cts.token);
    chai.assert.equal(res.command?.command, "fx-extension.openConfigState");
    chai.assert.isTrue(res.command?.title.includes("👉"));
    chai.expect(res.command?.arguments).to.deep.equal([{ type: "env", from: "manifest" }]);
  });

  it("ResolveEnvironmentVariableCodelens for AAD manifest", async () => {
    sinon.stub(envUtil, "readEnv").resolves(ok({}));

    const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
    const lens: PlaceholderCodeLens = new PlaceholderCodeLens(
      "${{ TEAMS_APP_ID }}",
      range,
      "aad.template.json"
    );
    const aadProvider = new AadAppTemplateCodeLensProvider();
    const cts = new vscode.CancellationTokenSource();

    const res = await aadProvider.resolveCodeLens(lens, cts.token);
    chai.assert.equal(res.command?.command, "fx-extension.openConfigState");
    chai.assert.isTrue(res.command?.title.includes("👉"));
    chai.expect(res.command?.arguments).to.deep.equal([{ type: "env", from: "aad" }]);
  });

  it("ComputeTemplateCodeLenses for AAD manifest", async () => {
    sinon.stub(envUtil, "readEnv").resolves(ok({}));
    const document = <vscode.TextDocument>{
      fileName: "./aad.manifest.json",
      getText: () => {
        return "{name: 'test'}";
      },
    };

    const aadProvider = new AadAppTemplateCodeLensProvider();
    const res = await aadProvider.provideCodeLenses(document);
    chai.assert.isTrue(
      res != null && res[0].command!.command === "fx-extension.openPreviewAadFile"
    );
  });
});

describe("Crypto CodeLensProvider", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("envData codelens", async () => {
    const document = {
      fileName: ".env.local",
      getText: () => {
        return "SECRET_VAR_2=crypto_abc";
      },
      lineAt: () => {
        return {
          lineNumber: 0,
          text: "SECRET_VAR_2=crypto_abc",
        };
      },
      positionAt: () => {
        return {
          character: 0,
          line: 0,
        };
      },
    } as unknown as vscode.TextDocument;

    const cryptoProvider = new CryptoCodeLensProvider();
    const codelens: vscode.CodeLens[] = cryptoProvider.provideCodeLenses(
      document
    ) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 1);
    chai.expect(codelens[0].command?.title).equal("🔑Decrypt secret");
    chai.expect(codelens[0].command?.command).equal("fx-extension.decryptSecret");
    sinon.restore();
  });

  it("hides when command is running", async () => {
    sinon.stub(globalVariables, "commandIsRunning").value(true);
    const document = {
      fileName: ".env.local",
      getText: () => {
        return "SECRET_VAR_2=crypto_abc";
      },
      lineAt: () => {
        return {
          lineNumber: 0,
          text: "SECRET_VAR_2=crypto_abc",
        };
      },
      positionAt: () => {
        return {
          character: 0,
          line: 0,
        };
      },
    } as unknown as vscode.TextDocument;

    const cryptoProvider = new CryptoCodeLensProvider();
    const codelens: vscode.CodeLens[] = cryptoProvider.provideCodeLenses(
      document
    ) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 0);
  });
});

describe("Copilot plugin CodeLensProvider", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("Add API", async () => {
    const document = {
      fileName: "manifest.json",
      getText: () => {
        return `"composeExtensions": {}`;
      },
      positionAt: () => {
        return new vscode.Position(0, 0);
      },
      lineAt: () => {
        return {
          lineNumber: 0,
          text: `"composeExtensions": {}`,
        };
      },
    } as any as vscode.TextDocument;

    const copilotPluginCodelensProvider = new CopilotPluginCodeLensProvider();
    const codelens: vscode.CodeLens[] = copilotPluginCodelensProvider.provideCodeLenses(
      document
    ) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 1);
    chai.expect(codelens[0].command).to.deep.equal({
      title: "➕Add another API",
      command: "fx-extension.copilotPluginAddAPI",
      arguments: [{ fsPath: document.fileName }],
    });
  });
});

describe("teamsapp.yml CodeLensProvider", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should work with correct teamsapp.yml", async () => {
    const text = `
version: 1.1.0

provision:
  provision: 1 // this line shouldn't have codelens
deploy:
  publish: 2 // this line shouldn't have codelens
publish:
  ccc: 3`;
    const document = {
      fileName: "teamsapp.yml",
      getText: () => {
        return text;
      },
      positionAt: () => {
        return new vscode.Position(0, 0);
      },
      lineAt: () => {
        return {
          lineNumber: 0,
          text: text,
        };
      },
    } as any as vscode.TextDocument;

    const provider = new TeamsAppYamlCodeLensProvider();
    const codelens: vscode.CodeLens[] = provider.provideCodeLenses(document) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 3);
    chai.expect(codelens[0].command?.command).eq("fx-extension.provision");
    chai.expect(codelens[0].command?.arguments).deep.eq([TelemetryTriggerFrom.CodeLens]);
    chai.expect(codelens[1].command?.command).eq("fx-extension.deploy");
    chai.expect(codelens[1].command?.arguments).deep.eq([TelemetryTriggerFrom.CodeLens]);
    chai.expect(codelens[2].command?.command).eq("fx-extension.publish");
    chai.expect(codelens[2].command?.arguments).deep.eq([TelemetryTriggerFrom.CodeLens]);
  });
});
