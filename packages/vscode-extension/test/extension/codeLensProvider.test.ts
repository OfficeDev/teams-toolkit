import * as chai from "chai";
import * as sinon from "sinon";
import * as fs from "fs-extra";
import { ManifestTemplateCodeLensProvider } from "../../src/codeLensProvider";
import * as vscode from "vscode";
import { TelemetryTriggerFrom } from "../../src/telemetry/extTelemetryEvents";

describe("Manifest codelens", () => {
  it("Template codelens", async () => {
    const document = <vscode.TextDocument>{
      fileName: "manifest.template.json",
      getText: () => {
        return "";
      },
    };

    const manifestProvider = new ManifestTemplateCodeLensProvider();
    const codelens: vscode.CodeLens[] = manifestProvider.provideCodeLenses(
      document
    ) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 1);
    chai.expect(codelens[0].command).to.deep.equal({
      title: "🖼️Preview",
      command: "fx-extension.openPreviewFile",
      arguments: [{ fsPath: document.fileName }],
    });
    sinon.restore();
  });

  it("Preview codelens", async () => {
    const document = <vscode.TextDocument>{
      fileName: "manifest.dev.json",
      getText: () => {
        return "";
      },
    };

    const manifestProvider = new ManifestTemplateCodeLensProvider();
    const codelens: vscode.CodeLens[] = manifestProvider.provideCodeLenses(
      document
    ) as vscode.CodeLens[];

    chai.assert.equal(codelens.length, 2);
    chai.expect(codelens[0].command).to.deep.equal({
      title: "🔄Update to Teams platform",
      command: "fx-extension.updatePreviewFile",
      arguments: [{ fsPath: document.fileName }, TelemetryTriggerFrom.CodeLens],
    });
    chai.expect(codelens[1].command).to.deep.equal({
      title: "⚠️This file is auto-generated, click here to edit the manifest template file",
      command: "fx-extension.editManifestTemplate",
      arguments: [{ fsPath: document.fileName }, TelemetryTriggerFrom.CodeLens],
    });
    sinon.restore();
  });
});
