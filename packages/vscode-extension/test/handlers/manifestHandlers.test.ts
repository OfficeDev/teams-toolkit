import { err, Inputs, ok } from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import * as fs from "fs-extra";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as launch from "../../src/debug/launch";
import * as globalVariables from "../../src/globalVariables";
import {
  buildPackageHandler,
  publishInDeveloperPortalHandler,
  treeViewPreviewHandler,
  updatePreviewManifest,
  validateManifestHandler,
} from "../../src/handlers/manifestHandlers";
import * as shared from "../../src/handlers/sharedOpts";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as systemEnvUtils from "../../src/utils/systemEnvUtils";
import { MockCore } from "../mocks/mockCore";

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
    beforeEach(() => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
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
      sandbox.stub(fs, "existsSync").returns(true);
      const res = await publishInDeveloperPortalHandler();
      assert.isTrue(res.isOk());
      const res2 = await publishInDeveloperPortalHandler();
      assert.isTrue(res2.isOk());
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

  describe("updatePreviewManifest", () => {
    it("happy", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const openTextDocumentStub = sandbox
        .stub(vscode.workspace, "openTextDocument")
        .returns(Promise.resolve("" as any));
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      await updatePreviewManifest([]);
      assert.isTrue(openTextDocumentStub.calledOnce);
    });
    it("getSelectedEnv error", async () => {
      const core = new MockCore();
      sandbox.stub(globalVariables, "core").value(core);
      sandbox.stub(core, "getSelectedEnv").resolves(err(new UserCancelError("VSC")));
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      const res = await updatePreviewManifest([]);
      assert.isTrue(res.isErr());
    });
  });

  describe("treeViewPreviewHandler", function () {
    it("previewWithManifest error", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox
        .stub(globalVariables.core, "previewWithManifest")
        .resolves(err({ foo: "bar" } as any));
      const result = await treeViewPreviewHandler("dev");
      assert.isTrue(result.isErr());
    });

    it(" happy path", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(globalVariables.core, "previewWithManifest").resolves(ok("test-url"));
      sandbox.stub(launch, "openHubWebClient").resolves();
      const result = await treeViewPreviewHandler("dev");
      assert.isTrue(result.isOk());
    });
  });
});
