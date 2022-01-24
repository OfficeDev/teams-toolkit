import * as chai from "chai";
import * as vscode from "vscode";
import * as sinon from "sinon";
import * as handlers from "../../../src/handlers";
import * as StringResources from "../../../src/resources/Strings.json";
import {
  Inputs,
  Platform,
  Stage,
  VsCodeEnv,
  ok,
  err,
  UserError,
  Void,
  Result,
  FxError,
} from "@microsoft/teamsfx-api";
import AppStudioTokenInstance from "../../../src/commonlib/appStudioLogin";
import { ExtTelemetry } from "../../../src/telemetry/extTelemetry";
import { WebviewPanel } from "../../../src/controls/webviewPanel";
import { PanelType } from "../../../src/controls/PanelType";
import { AzureAccountManager } from "../../../src/commonlib/azureLogin";
import { MockCore } from "./mocks/mockCore";
import * as commonUtils from "../../../src/utils/commonUtils";
import * as extension from "../../../src/extension";
import * as accountTree from "../../../src/accountTree";
import TreeViewManagerInstance from "../../../src/treeview/treeViewManager";
import { CollaborationState, CoreHookContext } from "@microsoft/teamsfx-core";
import { ext } from "../../../src/extensionVariables";
import { Uri } from "vscode";
import * as envTree from "../../../src/envTree";

suite("handlers", () => {
  test("getWorkspacePath()", () => {
    chai.expect(handlers.getWorkspacePath()).equals(undefined);
  });

  suite("activate()", function () {
    const sandbox = sinon.createSandbox();

    this.beforeAll(() => {
      sandbox.stub(accountTree, "registerAccountTreeHandler");
      sandbox.stub(AzureAccountManager.prototype, "setStatusChangeMap");
      sandbox.stub(AppStudioTokenInstance, "setStatusChangeMap");
      sandbox.stub(vscode.extensions, "getExtension").returns(undefined);
      sandbox.stub(TreeViewManagerInstance, "getTreeView").returns(undefined);
      sandbox.stub(ExtTelemetry, "dispose");
    });

    this.afterAll(() => {
      sandbox.restore();
    });

    test("No globalState error", async () => {
      const result = await handlers.activate();
      chai.assert.deepEqual(result.isOk() ? result.value : result.error.name, {});
    });
  });

  test("getSystemInputs()", () => {
    const input: Inputs = handlers.getSystemInputs();

    chai.expect(input.platform).equals(Platform.VSCode);
  });

  suite("command handlers", function () {
    this.afterEach(() => {
      sinon.restore();
    });

    test("createNewProjectHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(ExtTelemetry, "dispose");
      const createProject = sinon.spy(handlers.core, "createProject");
      sinon.stub(vscode.commands, "executeCommand");

      await handlers.createNewProjectHandler();

      sinon.assert.calledOnce(createProject);
      sinon.restore();
    });

    test("provisionHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const provisionResources = sinon.spy(handlers.core, "provisionResources");
      sinon.stub(envTree, "registerEnvTreeHandler");

      await handlers.provisionHandler();

      sinon.assert.calledOnce(provisionResources);
      sinon.restore();
    });

    test("deployHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const deployArtifacts = sinon.spy(handlers.core, "deployArtifacts");

      await handlers.deployHandler();

      sinon.assert.calledOnce(deployArtifacts);
      sinon.restore();
    });

    test("publishHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const publishApplication = sinon.spy(handlers.core, "publishApplication");

      await handlers.publishHandler();

      sinon.assert.calledOnce(publishApplication);
      sinon.restore();
    });
  });

  suite("runCommand()", function () {
    this.afterEach(() => {
      sinon.restore();
    });
    test("create", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createProject = sinon.spy(handlers.core, "createProject");
      sinon.stub(vscode.commands, "executeCommand");

      await handlers.runCommand(Stage.create);

      sinon.restore();
      sinon.assert.calledOnce(createProject);
    });

    test("provisionResources", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const provisionResources = sinon.spy(handlers.core, "provisionResources");

      await handlers.runCommand(Stage.provision);

      sinon.restore();
      sinon.assert.calledOnce(provisionResources);
    });

    test("deployArtifacts", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const deployArtifacts = sinon.spy(handlers.core, "deployArtifacts");

      await handlers.runCommand(Stage.deploy);

      sinon.restore();
      sinon.assert.calledOnce(deployArtifacts);
    });

    test("localDebug", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");

      let ignoreEnvInfo: boolean | undefined = undefined;
      let localDebugCalled = 0;
      sinon
        .stub(handlers.core, "localDebug")
        .callsFake(
          async (
            inputs: Inputs,
            ctx?: CoreHookContext | undefined
          ): Promise<Result<Void, FxError>> => {
            ignoreEnvInfo = inputs.ignoreEnvInfo;
            localDebugCalled += 1;
            return ok({});
          }
        );

      await handlers.runCommand(Stage.debug);

      sinon.restore();
      chai.expect(ignoreEnvInfo).to.equal(true);
      chai.expect(localDebugCalled).equals(1);
    });

    test("publishApplication", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const publishApplication = sinon.spy(handlers.core, "publishApplication");

      await handlers.runCommand(Stage.publish);

      sinon.restore();
      sinon.assert.calledOnce(publishApplication);
    });

    test("createEnv", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createEnv = sinon.spy(handlers.core, "createEnv");
      sinon.stub(vscode.commands, "executeCommand");

      await handlers.runCommand(Stage.createEnv);

      sinon.restore();
      sinon.assert.calledOnce(createEnv);
    });
  });

  suite("detectVsCodeEnv()", function () {
    this.afterEach(() => {
      sinon.restore();
    });

    test("locally run", () => {
      const expectedResult = {
        extensionKind: vscode.ExtensionKind.UI,
        id: "",
        extensionUri: vscode.Uri.file(""),
        extensionPath: "",
        isActive: true,
        packageJSON: {},
        exports: undefined,
        activate: sinon.spy(),
      };
      const getExtension = sinon
        .stub(vscode.extensions, "getExtension")
        .callsFake((name: string) => {
          return expectedResult;
        });

      chai.expect(handlers.detectVsCodeEnv()).equals(VsCodeEnv.local);
      getExtension.restore();
    });

    test("Remotely run", () => {
      const expectedResult = {
        extensionKind: vscode.ExtensionKind.Workspace,
        id: "",
        extensionUri: vscode.Uri.file(""),
        extensionPath: "",
        isActive: true,
        packageJSON: {},
        exports: undefined,
        activate: sinon.spy(),
      };
      const getExtension = sinon
        .stub(vscode.extensions, "getExtension")
        .callsFake((name: string) => {
          return expectedResult;
        });

      chai
        .expect(handlers.detectVsCodeEnv())
        .oneOf([VsCodeEnv.remote, VsCodeEnv.codespaceVsCode, VsCodeEnv.codespaceBrowser]);
      getExtension.restore();
    });
  });

  test("openWelcomeHandler", async () => {
    const executeCommands = sinon.stub(vscode.commands, "executeCommand");
    const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.openWelcomeHandler();

    sinon.assert.calledOnceWithExactly(
      executeCommands,
      "workbench.action.openWalkthrough",
      "TeamsDevApp.ms-teams-vscode-extension#teamsToolkitQuickStart"
    );
    executeCommands.restore();
    sendTelemetryEvent.restore();
  });

  test("openSamplesHandler", async () => {
    const createOrShow = sinon.stub(WebviewPanel, "createOrShow");
    const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.openSamplesHandler();

    sinon.assert.calledOnceWithExactly(createOrShow, PanelType.SampleGallery);
    createOrShow.restore();
    sendTelemetryEvent.restore();
  });

  test("signOutM365", async () => {
    const signOut = sinon.stub(AppStudioTokenInstance, "signout");
    const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
    sinon.stub(envTree, "registerEnvTreeHandler");

    await handlers.signOutM365(false);

    sinon.assert.calledOnce(signOut);
    signOut.restore();
    sendTelemetryEvent.restore();
  });

  test("signOutAzure", async () => {
    Object.setPrototypeOf(AzureAccountManager, sinon.stub());
    const signOut = sinon.stub(AzureAccountManager.getInstance(), "signout");
    const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.signOutAzure(false);

    sinon.assert.calledOnce(signOut);
    signOut.restore();
    sendTelemetryEvent.restore();
  });

  suite("decryptSecret", function () {
    this.afterEach(() => {
      sinon.restore();
    });
    test("successfully update secret", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const decrypt = sinon.spy(handlers.core, "decrypt");
      const encrypt = sinon.spy(handlers.core, "encrypt");
      sinon.stub(vscode.commands, "executeCommand");
      const editBuilder = sinon.spy();
      sinon.stub(vscode.window, "activeTextEditor").value({
        edit: function (callback: (eb: any) => void) {
          callback({
            replace: editBuilder,
          });
        },
      });
      sinon.stub(extension, "VS_CODE_UI").value({
        inputText: () => Promise.resolve(ok({ type: "success", result: "inputValue" })),
      });
      const range = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 15));

      await handlers.decryptSecret("test", range);

      sinon.assert.calledOnce(decrypt);
      sinon.assert.calledOnce(encrypt);
      sinon.assert.calledOnce(editBuilder);
      sinon.assert.calledTwice(sendTelemetryEvent);
      sinon.assert.notCalled(sendTelemetryErrorEvent);
      sinon.restore();
    });

    test("failed to update due to corrupted secret", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const decrypt = sinon.stub(handlers.core, "decrypt");
      decrypt.returns(Promise.resolve(err(new UserError("fake error", "", ""))));
      const encrypt = sinon.spy(handlers.core, "encrypt");
      sinon.stub(vscode.commands, "executeCommand");
      const editBuilder = sinon.spy();
      sinon.stub(vscode.window, "activeTextEditor").value({
        edit: function (callback: (eb: any) => void) {
          callback({
            replace: editBuilder,
          });
        },
      });
      const showMessage = sinon.stub(vscode.window, "showErrorMessage");
      const range = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 15));

      await handlers.decryptSecret("test", range);

      sinon.assert.calledOnce(decrypt);
      sinon.assert.notCalled(encrypt);
      sinon.assert.notCalled(editBuilder);
      sinon.assert.calledOnce(showMessage);
      sinon.assert.calledOnce(sendTelemetryEvent);
      sinon.assert.calledOnce(sendTelemetryErrorEvent);
      sinon.restore();
    });
  });

  suite("permissions", async function () {
    this.afterEach(() => {
      sinon.restore();
    });
    test("grant permission", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(AppStudioTokenInstance, "getJsonObject").resolves({
        tid: "fake-tenant-id",
      });

      ext.workspaceUri = Uri.parse("file://fakeProjectPath");
      sinon.stub(commonUtils, "isSPFxProject").resolves(false);
      sinon.stub(commonUtils, "getM365TenantFromEnv").callsFake(async (env: string) => {
        return "fake-tenant-id";
      });

      sinon.stub(MockCore.prototype, "grantPermission").returns(
        Promise.resolve(
          ok({
            state: CollaborationState.OK,
            userInfo: {
              userObjectId: "fake-user-object-id",
              userPrincipalName: "fake-user-principle-name",
            },
            permissions: [
              {
                name: "name",
                type: "type",
                resourceId: "id",
                roles: ["Owner"],
              },
            ],
          })
        )
      );

      const result = await handlers.grantPermission("env");
      chai.expect(result.isOk()).equals(true);
    });

    test("grant permission with empty tenant id", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(AppStudioTokenInstance, "getJsonObject").resolves({
        tid: "fake-tenant-id",
      });
      sinon.stub(commonUtils, "getM365TenantFromEnv").callsFake(async (env: string) => {
        return "";
      });

      const result = await handlers.grantPermission("env");

      if (result.isErr()) {
        throw new Error("Unexpected error: " + result.error.message);
      }

      chai.expect(result.isOk()).equals(true);
      chai.expect(result.value.state === CollaborationState.EmptyM365Tenant);
    });

    test("list collaborators", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(AppStudioTokenInstance, "getJsonObject").resolves({
        tid: "fake-tenant-id",
      });
      sinon.stub(commonUtils, "getM365TenantFromEnv").callsFake(async (env: string) => {
        return "fake-tenant-id";
      });

      await handlers.listCollaborator("env");
    });

    test("list collaborators with empty tenant id", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(AppStudioTokenInstance, "getJsonObject").resolves({
        tid: "fake-tenant-id",
      });
      sinon.stub(commonUtils, "getM365TenantFromEnv").callsFake(async (env: string) => {
        return "";
      });

      const showWarningMessage = sinon
        .stub(vscode.window, "showWarningMessage")
        .callsFake((message: string): any => {
          chai.expect(message).equal(StringResources.vsc.commandsTreeViewProvider.emptyM365Tenant);
        });
      await handlers.listCollaborator("env");

      chai.expect(showWarningMessage.callCount).to.be.equal(1);
    });

    test("edit manifest template: local", async () => {
      sinon.restore();
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const openTextDocument = sinon
        .stub(vscode.workspace, "openTextDocument")
        .returns(new Promise<vscode.TextDocument>((resolve) => {}));
      sinon
        .stub(vscode.workspace, "workspaceFolders")
        .returns([{ uri: { fsPath: "c:\\manifestTestFolder" } }]);

      const args = [{ fsPath: "c:\\testPath\\manifest.local.json" }, "CodeLens"];
      await handlers.editManifestTemplate(args);
      chai.assert.isTrue(
        openTextDocument.calledOnceWith(
          "undefined/templates/appPackage/manifest.local.template.json" as any
        )
      );
    });

    test("edit manifest template: remote", async () => {
      sinon.restore();
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const openTextDocument = sinon
        .stub(vscode.workspace, "openTextDocument")
        .returns(new Promise<vscode.TextDocument>((resolve) => {}));
      sinon
        .stub(vscode.workspace, "workspaceFolders")
        .returns([{ uri: { fsPath: "c:\\manifestTestFolder" } }]);

      const args = [{ fsPath: "c:\\testPath\\manifest.dev.json" }, "CodeLens"];
      await handlers.editManifestTemplate(args);
      console.log(openTextDocument.args[0][0]);
      chai.assert.equal(
        openTextDocument.args[0],
        "undefined/templates/appPackage/manifest.remote.template.json" as any
      );
      chai.assert.isTrue(
        openTextDocument.calledOnceWith(
          "undefined/templates/appPackage/manifest.remote.template.json" as any
        )
      );
    });
  });
});
