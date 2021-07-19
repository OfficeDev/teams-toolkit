import * as chai from "chai";
import * as vscode from "vscode";
import * as sinon from "sinon";
import * as handlers from "../../../src/handlers";
import { Inputs, Platform, Stage, VsCodeEnv } from "@microsoft/teamsfx-api";
import AppStudioTokenInstance from "../../../src/commonlib/appStudioLogin";
import { ExtTelemetry } from "../../../src/telemetry/extTelemetry";
import { WebviewPanel } from "../../../src/controls/webviewPanel";
import { PanelType } from "../../../src/controls/PanelType";
import { AzureAccountManager } from "../../../src/commonlib/azureLogin";
import { MockCore } from "./mocks/mockCore";

suite("handlers", () => {
  test("getWorkspacePath()", () => {
    chai.expect(handlers.getWorkspacePath()).equals(undefined);
  });

  test("getSystemInputs()", () => {
    const input: Inputs = handlers.getSystemInputs();

    chai.expect(input.platform).equals(Platform.VSCode);
    chai.expect(input.correlationId).to.be.a("string");
  });

  suite("command handlers", () => {
    test("createNewProjectHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
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

  suite("runCommand()", () => {
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
      const localDebug = sinon.spy(handlers.core, "localDebug");

      await handlers.runCommand(Stage.debug);

      sinon.restore();
      sinon.assert.calledOnce(localDebug);
    });

    test("publishApplication", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const publishApplication = sinon.spy(handlers.core, "publishApplication");

      await handlers.runCommand(Stage.publish);

      sinon.restore();
      sinon.assert.calledOnce(publishApplication);
    });
  });

  suite("detectVsCodeEnv()", () => {
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
    const createOrShow = sinon.stub(WebviewPanel, "createOrShow");
    const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.openWelcomeHandler();

    sinon.assert.calledOnceWithExactly(createOrShow, PanelType.QuickStart);
    createOrShow.restore();
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
});
