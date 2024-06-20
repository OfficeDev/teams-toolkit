import { err, ok } from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as globalVariables from "../../src/globalVariables";
import {
  buildPackageHandler,
  publishInDeveloperPortalHandler,
  validateManifestHandler,
} from "../../src/handlers/manifestHandlers";
import * as shared from "../../src/handlers/sharedOpts";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";

describe("Manifest handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
  });

  afterEach(() => {
    sandbox.restore();
  });
  describe("validateManifestHandler", () => {
    it("happy", async () => {
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      const res = await validateManifestHandler();
      assert.isTrue(res.isOk());
    });
  });
  describe("buildPackageHandler", function () {
    it("happy()", async () => {
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      const res = await buildPackageHandler();
      assert.isTrue(res.isOk());
    });
  });
  describe("publishInDeveloperPortalHandler", async () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("publish in developer portal - success", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test.zip" }));
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectOption")
        .resolves(ok({ type: "success", result: "test.zip" }));
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);
      const res = await publishInDeveloperPortalHandler();
      assert.isTrue(res.isOk());
    });

    it("publish in developer portal - cancelled", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test2.zip" }));
      sandbox.stub(vsc_ui.VS_CODE_UI, "selectOption").resolves(err(new UserCancelError("VSC")));
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);
      const res = await publishInDeveloperPortalHandler();
      assert.isTrue(res.isOk());
    });
    it("select file error", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox.stub(vsc_ui.VS_CODE_UI, "selectFile").resolves(err(new UserCancelError("VSC")));
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);
      const res = await publishInDeveloperPortalHandler();
      assert.isTrue(res.isOk());
    });
    it("runCommand error", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new vsc_ui.VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test.zip" }));
      sandbox.stub(shared, "runCommand").resolves(err(new UserCancelError("VSC")));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectOption")
        .resolves(ok({ type: "success", result: "test.zip" }));
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);
      const res = await publishInDeveloperPortalHandler();
      assert.isTrue(res.isErr());
    });
  });
});
