/**
 * @author HuihuiWu-Microsoft <73154171+HuihuiWu-Microsoft@users.noreply.github.com>
 */
import {
  FxError,
  Inputs,
  Platform,
  Result,
  Stage,
  SystemError,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  AppDefinition,
  DepsManager,
  DepsType,
  UnhandledError,
  UserCancelError,
  featureFlagManager,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as globalState from "@microsoft/teamsfx-core/build/common/globalState";
import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import * as chai from "chai";
import * as mockfs from "mock-fs";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import * as vscode from "vscode";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import VsCodeLogInstance from "../../src/commonlib/log";
import M365TokenInstance from "../../src/commonlib/m365Login";
import { DeveloperPortalHomeLink } from "../../src/constants";
import { PanelType } from "../../src/controls/PanelType";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import * as debugConstants from "../../src/debug/common/debugConstants";
import * as getStartedChecker from "../../src/debug/depsChecker/getStartedChecker";
import * as launch from "../../src/debug/launch";
import * as errorCommon from "../../src/error/common";
import { ExtensionErrors } from "../../src/error/error";
import * as globalVariables from "../../src/globalVariables";
import * as handlers from "../../src/handlers";
import {
  openAppManagement,
  openDocumentHandler,
  openWelcomeHandler,
} from "../../src/handlers/openLinkHandlers";
import { runCommand } from "../../src/handlers/sharedOpts";
import { TeamsAppMigrationHandler } from "../../src/migration/migrationHandler";
import { ProgressHandler } from "../../src/progressHandler";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { VsCodeUI } from "../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as extTelemetryEvents from "../../src/telemetry/extTelemetryEvents";
import { updateAutoOpenGlobalKey } from "../../src/utils/globalStateUtils";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as migrationUtils from "../../src/utils/migrationUtils";
import { ExtensionSurvey } from "../../src/utils/survey";
import * as systemEnvUtils from "../../src/utils/systemEnvUtils";
import * as telemetryUtils from "../../src/utils/telemetryUtils";
import { MockCore } from "../mocks/mockCore";

describe("handlers", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("updateAutoOpenGlobalKey", async () => {
    sandbox.stub(telemetryUtils, "isTriggerFromWalkThrough").returns(true);
    sandbox.stub(globalVariables, "checkIsSPFx").returns(true);
    sandbox.stub(projectSettingsHelper, "isValidOfficeAddInProject").returns(false);
    const globalStateUpdateStub = sandbox.stub(globalState, "globalStateUpdate");

    await updateAutoOpenGlobalKey(false, vscode.Uri.file("test"), [
      { type: "type", content: "content" },
    ]);

    chai.assert.isTrue(globalStateUpdateStub.callCount === 4);
  });

  describe("command handlers", function () {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("API ME: copilotPluginAddAPIHandler()", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const addAPIHanlder = sandbox.spy(globalVariables.core, "copilotPluginAddAPI");
      const args = [
        {
          fsPath: "manifest.json",
        },
      ];

      await handlers.copilotPluginAddAPIHandler(args);

      sinon.assert.calledOnce(addAPIHanlder);
    });

    it("API Plugin: copilotPluginAddAPIHandler()", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const addAPIHanlder = sandbox.spy(globalVariables.core, "copilotPluginAddAPI");
      const args = [
        {
          fsPath: "openapi.yaml",
          isFromApiPlugin: true,
          manifestPath: "manifest.json",
        },
      ];

      await handlers.copilotPluginAddAPIHandler(args);

      sinon.assert.calledOnce(addAPIHanlder);
    });

    it("treeViewPreviewHandler() - previewWithManifest error", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox
        .stub(globalVariables.core, "previewWithManifest")
        .resolves(err({ foo: "bar" } as any));

      const result = await handlers.treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isErr());
    });

    it("treeViewPreviewHandler() - happy path", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(globalVariables.core, "previewWithManifest").resolves(ok("test-url"));
      sandbox.stub(launch, "openHubWebClient").resolves();

      const result = await handlers.treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isOk());
    });
  });

  it("azureAccountSignOutHelpHandler()", async () => {
    try {
      handlers.azureAccountSignOutHelpHandler();
    } catch (e) {
      chai.assert.isTrue(e instanceof Error);
    }
  });

  describe("runCommand()", function () {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("create sample with projectid", async () => {
      sandbox.restore();
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createProject = sandbox.spy(globalVariables.core, "createProject");
      sandbox.stub(vscode.commands, "executeCommand");
      const inputs = { projectId: uuid.v4(), platform: Platform.VSCode };

      await runCommand(Stage.create, inputs);

      sinon.assert.calledOnce(createProject);
      chai.assert.isTrue(createProject.args[0][0].projectId != undefined);
      chai.assert.isTrue(sendTelemetryEvent.args[0][1]!["new-project-id"] != undefined);
    });

    it("create from scratch without projectid", async () => {
      sandbox.restore();
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createProject = sandbox.spy(globalVariables.core, "createProject");
      sandbox.stub(vscode.commands, "executeCommand");

      await runCommand(Stage.create);
      sinon.assert.calledOnce(createProject);
      chai.assert.isTrue(createProject.args[0][0].projectId != undefined);
      chai.assert.isTrue(sendTelemetryEvent.args[0][1]!["new-project-id"] != undefined);
    });

    it("provisionResources", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const provisionResources = sandbox.spy(globalVariables.core, "provisionResources");

      await runCommand(Stage.provision);
      sinon.assert.calledOnce(provisionResources);
    });
    it("deployTeamsManifest", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const deployTeamsManifest = sandbox.spy(globalVariables.core, "deployTeamsManifest");

      await runCommand(Stage.deployTeams);
      sinon.assert.calledOnce(deployTeamsManifest);
    });
    it("addWebpart", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const addWebpart = sandbox.spy(globalVariables.core, "addWebpart");

      await runCommand(Stage.addWebpart);
      sinon.assert.calledOnce(addWebpart);
    });
    it("createAppPackage", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const createAppPackage = sandbox.spy(globalVariables.core, "createAppPackage");

      await runCommand(Stage.createAppPackage);
      sinon.assert.calledOnce(createAppPackage);
    });
    it("error", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      try {
        await runCommand("none" as any);
        sinon.assert.fail("should not reach here");
      } catch (e) {}
    });
    it("provisionResources - local", async () => {
      const mockCore = new MockCore();
      const mockCoreStub = sandbox
        .stub(mockCore, "provisionResources")
        .resolves(err(new UserError("test", "test", "test")));
      sandbox.stub(globalVariables, "core").value(mockCore);

      const res = await runCommand(Stage.provision, {
        platform: Platform.VSCode,
        env: "local",
      } as Inputs);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(
          res.error.recommendedOperation,
          debugConstants.RecommendedOperations.DebugInTestTool
        );
      }
      sinon.assert.calledOnce(mockCoreStub);
    });

    it("deployArtifacts", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const deployArtifacts = sandbox.spy(globalVariables.core, "deployArtifacts");

      await runCommand(Stage.deploy);
      sinon.assert.calledOnce(deployArtifacts);
    });

    it("deployArtifacts - local", async () => {
      const mockCore = new MockCore();
      const mockCoreStub = sandbox
        .stub(mockCore, "deployArtifacts")
        .resolves(err(new UserError("test", "test", "test")));
      sandbox.stub(globalVariables, "core").value(mockCore);

      await runCommand(Stage.deploy, {
        platform: Platform.VSCode,
        env: "local",
      } as Inputs);
      sinon.assert.calledOnce(mockCoreStub);
    });

    it("deployAadManifest", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const deployAadManifest = sandbox.spy(globalVariables.core, "deployAadManifest");
      const input: Inputs = systemEnvUtils.getSystemInputs();
      await runCommand(Stage.deployAad, input);

      sandbox.assert.calledOnce(deployAadManifest);
    });

    it("deployAadManifest happy path", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(globalVariables.core, "deployAadManifest").resolves(ok(undefined));
      const input: Inputs = systemEnvUtils.getSystemInputs();
      const res = await runCommand(Stage.deployAad, input);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.strictEqual(res.value, undefined);
      }
    });

    it("localDebug", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());

      let ignoreEnvInfo: boolean | undefined = undefined;
      let localDebugCalled = 0;
      sandbox
        .stub(globalVariables.core, "localDebug")
        .callsFake(async (inputs: Inputs): Promise<Result<undefined, FxError>> => {
          ignoreEnvInfo = inputs.ignoreEnvInfo;
          localDebugCalled += 1;
          return ok(undefined);
        });

      await runCommand(Stage.debug);
      chai.expect(ignoreEnvInfo).to.equal(false);
      chai.expect(localDebugCalled).equals(1);
    });

    it("publishApplication", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const publishApplication = sandbox.spy(globalVariables.core, "publishApplication");

      await runCommand(Stage.publish);
      sinon.assert.calledOnce(publishApplication);
    });

    it("createEnv", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const createEnv = sandbox.spy(globalVariables.core, "createEnv");
      sandbox.stub(vscode.commands, "executeCommand");

      await runCommand(Stage.createEnv);
      sinon.assert.calledOnce(createEnv);
    });
  });

  it("openWelcomeHandler", async () => {
    sandbox.stub(featureFlagManager, "getBooleanValue").returns(false);
    const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await openWelcomeHandler();

    sandbox.assert.calledOnceWithExactly(
      executeCommands,
      "workbench.action.openWalkthrough",
      "TeamsDevApp.ms-teams-vscode-extension#teamsToolkitGetStarted"
    );
  });

  it("openWelcomeHandler with chat", async () => {
    sandbox.stub(featureFlagManager, "getBooleanValue").returns(true);
    const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await openWelcomeHandler();

    sandbox.assert.calledOnceWithExactly(
      executeCommands,
      "workbench.action.openWalkthrough",
      "TeamsDevApp.ms-teams-vscode-extension#teamsToolkitGetStartedWithChat"
    );
  });

  it("walkthrough: build intelligent apps", async () => {
    const executeCommands = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.openBuildIntelligentAppsWalkthroughHandler();
    sandbox.assert.calledOnceWithExactly(
      executeCommands,
      "workbench.action.openWalkthrough",
      "TeamsDevApp.ms-teams-vscode-extension#buildIntelligentApps"
    );
  });

  it("openSurveyHandler", async () => {
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const openLink = sandbox.stub(ExtensionSurvey.getInstance(), "openSurveyLink");
    sandbox.stub(localizeUtils, "getDefaultString").returns("test");

    await handlers.openSurveyHandler([extTelemetryEvents.TelemetryTriggerFrom.TreeView]);
    chai.assert.isTrue(sendTelemetryEvent.calledOnce);
    chai.assert.isTrue(openLink.calledOnce);
  });

  it("openSamplesHandler", async () => {
    const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.openSamplesHandler();

    sandbox.assert.calledOnceWithExactly(createOrShow, PanelType.SampleGallery, []);
  });

  describe("decryptSecret", function () {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("successfully update secret", async () => {
      sandbox.stub(globalVariables, "context").value({ extensionPath: "" });
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const decrypt = sandbox.spy(globalVariables.core, "decrypt");
      const encrypt = sandbox.spy(globalVariables.core, "encrypt");
      sandbox.stub(vscode.commands, "executeCommand");
      const editBuilder = sandbox.spy();
      sandbox.stub(vscode.window, "activeTextEditor").value({
        edit: function (callback: (eb: any) => void) {
          callback({
            replace: editBuilder,
          });
        },
      });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        inputText: () => Promise.resolve(ok({ type: "success", result: "inputValue" })),
      });
      const range = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 15));

      await handlers.decryptSecret("test", range);

      sinon.assert.calledOnce(decrypt);
      sinon.assert.calledOnce(encrypt);
      sinon.assert.calledOnce(editBuilder);
      sinon.assert.calledTwice(sendTelemetryEvent);
      sinon.assert.notCalled(sendTelemetryErrorEvent);
    });

    it("failed to update due to corrupted secret", async () => {
      sandbox.stub(globalVariables, "context").value({ extensionPath: "" });
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const decrypt = sandbox.stub(globalVariables.core, "decrypt");
      decrypt.returns(Promise.resolve(err(new UserError("", "fake error", ""))));
      const encrypt = sandbox.spy(globalVariables.core, "encrypt");
      sandbox.stub(vscode.commands, "executeCommand");
      const editBuilder = sandbox.spy();
      sandbox.stub(vscode.window, "activeTextEditor").value({
        edit: function (callback: (eb: any) => void) {
          callback({
            replace: editBuilder,
          });
        },
      });
      const showMessage = sandbox.stub(vscode.window, "showErrorMessage");
      const range = new vscode.Range(new vscode.Position(0, 10), new vscode.Position(0, 15));

      await handlers.decryptSecret("test", range);

      sinon.assert.calledOnce(decrypt);
      sinon.assert.notCalled(encrypt);
      sinon.assert.notCalled(editBuilder);
      sinon.assert.calledOnce(showMessage);
      sinon.assert.calledOnce(sendTelemetryEvent);
      sinon.assert.calledOnce(sendTelemetryErrorEvent);
    });
  });

  describe("checkUpgrade", function () {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({
        locale: "en-us",
        platform: "vsc",
        projectPath: undefined,
        vscodeEnv: "local",
      } as Inputs);
      sandbox.stub(globalVariables, "core").value(new MockCore());
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("calls phantomMigrationV3 with isNonmodalMessage when auto triggered", async () => {
      const phantomMigrationV3Stub = sandbox
        .stub(globalVariables.core, "phantomMigrationV3")
        .resolves(ok(undefined));
      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.Auto]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          isNonmodalMessage: true,
        } as Inputs)
      );
    });

    it("calls phantomMigrationV3 with skipUserConfirm trigger from sideBar and command palette", async () => {
      const phantomMigrationV3Stub = sandbox
        .stub(globalVariables.core, "phantomMigrationV3")
        .resolves(ok(undefined));
      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.SideBar]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          skipUserConfirm: true,
        } as Inputs)
      );
      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.CommandPalette]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledWith({
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          skipUserConfirm: true,
        } as Inputs)
      );
    });

    it("shows error message when phantomMigrationV3 fails", async () => {
      const error = new UserError(
        "test source",
        "test name",
        "test message",
        "test displayMessage"
      );
      error.helpLink = "test helpLink";
      const phantomMigrationV3Stub = sandbox
        .stub(globalVariables.core, "phantomMigrationV3")
        .resolves(err(error));
      sandbox.stub(localizeUtils, "localize").returns("");
      const showErrorMessageStub = sandbox.stub(vscode.window, "showErrorMessage");
      sandbox.stub(vscode.commands, "executeCommand");

      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.SideBar]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          skipUserConfirm: true,
        } as Inputs)
      );
      chai.assert.isTrue(showErrorMessageStub.calledOnce);
    });
  });

  describe("getDotnetPathHandler", async () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("dotnet is installed", async () => {
      sandbox.stub(DepsManager.prototype, "getStatus").resolves([
        {
          name: ".NET Core SDK",
          type: DepsType.Dotnet,
          isInstalled: true,
          command: "",
          details: {
            isLinuxSupported: false,
            installVersion: "",
            supportedVersions: [],
            binFolders: ["dotnet-bin-folder/dotnet"],
          },
        },
      ]);

      const dotnetPath = await handlers.getDotnetPathHandler();
      chai.assert.equal(dotnetPath, `${path.delimiter}dotnet-bin-folder${path.delimiter}`);
    });

    it("dotnet is not installed", async () => {
      sandbox.stub(DepsManager.prototype, "getStatus").resolves([
        {
          name: ".NET Core SDK",
          type: DepsType.Dotnet,
          isInstalled: false,
          command: "",
          details: {
            isLinuxSupported: false,
            installVersion: "",
            supportedVersions: [],
            binFolders: undefined,
          },
        },
      ]);

      const dotnetPath = await handlers.getDotnetPathHandler();
      chai.assert.equal(dotnetPath, `${path.delimiter}`);
    });

    it("failed to get dotnet path", async () => {
      sandbox.stub(DepsManager.prototype, "getStatus").rejects(new Error("failed to get status"));
      const dotnetPath = await handlers.getDotnetPathHandler();
      chai.assert.equal(dotnetPath, `${path.delimiter}`);
    });
  });

  describe("scaffoldFromDeveloperPortalHandler", async () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").resolves();
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent").resolves();
      sandbox.stub(globalVariables, "checkIsSPFx").returns(false);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("missing args", async () => {
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);

      const res = await handlers.scaffoldFromDeveloperPortalHandler();

      chai.assert.equal(res.isOk(), true);
      chai.assert.equal(createProgressBar.notCalled, true);
    });

    it("incorrect number of args", async () => {
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);

      const res = await handlers.scaffoldFromDeveloperPortalHandler();

      chai.assert.equal(res.isOk(), true);
      chai.assert.equal(createProgressBar.notCalled, true);
    });

    it("general error when signing in M365", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sandbox.stub(progressHandler, "start").resolves();
      const endProgress = sandbox.stub(progressHandler, "end").resolves();
      sandbox.stub(M365TokenInstance, "signInWhenInitiatedFromTdp").throws("error1");
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      const showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);
      chai.assert.isTrue(res.isErr());
      chai.assert.isTrue(createProgressBar.calledOnce);
      chai.assert.isTrue(startProgress.calledOnce);
      chai.assert.isTrue(endProgress.calledOnceWithExactly(false));
      chai.assert.isTrue(showErrorMessage.calledOnce);
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof UnhandledError);
      }
    });

    it("error when signing M365", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sandbox.stub(progressHandler, "start").resolves();
      const endProgress = sandbox.stub(progressHandler, "end").resolves();
      sandbox
        .stub(M365TokenInstance, "signInWhenInitiatedFromTdp")
        .resolves(err(new UserError("source", "name", "message", "displayMessage")));
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      const showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);

      chai.assert.equal(res.isErr(), true);
      chai.assert.equal(createProgressBar.calledOnce, true);
      chai.assert.equal(startProgress.calledOnce, true);
      chai.assert.equal(endProgress.calledOnceWithExactly(false), true);
      chai.assert.equal(showErrorMessage.calledOnce, true);
    });

    it("error when signing in M365 but missing display message", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sandbox.stub(progressHandler, "start").resolves();
      const endProgress = sandbox.stub(progressHandler, "end").resolves();
      sandbox
        .stub(M365TokenInstance, "signInWhenInitiatedFromTdp")
        .resolves(err(new UserError("source", "name", "", "")));
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      const showErrorMessage = sandbox.stub(vscode.window, "showErrorMessage");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);

      chai.assert.equal(res.isErr(), true);
      chai.assert.equal(createProgressBar.calledOnce, true);
      chai.assert.equal(startProgress.calledOnce, true);
      chai.assert.equal(endProgress.calledOnceWithExactly(false), true);
      chai.assert.equal(showErrorMessage.calledOnce, true);
    });

    it("failed to get teams app", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sandbox.stub(progressHandler, "start").resolves();
      const endProgress = sandbox.stub(progressHandler, "end").resolves();
      sandbox.stub(M365TokenInstance, "signInWhenInitiatedFromTdp").resolves(ok("token"));
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(err(new SystemError("source", "name", "", "")));
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(globalState, "globalStateUpdate");
      const getApp = sandbox.stub(teamsDevPortalClient, "getApp").throws("error");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);

      chai.assert.isTrue(res.isErr());
      chai.assert.isTrue(getApp.calledOnce);
      chai.assert.isTrue(createProgressBar.calledOnce);
      chai.assert.isTrue(startProgress.calledOnce);
      chai.assert.isTrue(endProgress.calledOnceWithExactly(true));
    });

    it("happy path", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sandbox.stub(progressHandler, "start").resolves();
      const endProgress = sandbox.stub(progressHandler, "end").resolves();
      sandbox.stub(M365TokenInstance, "signInWhenInitiatedFromTdp").resolves(ok("token"));
      sandbox.stub(M365TokenInstance, "getAccessToken").resolves(ok("authSvcToken"));
      sandbox.stub(teamsDevPortalClient, "setRegionEndpointByToken").resolves();
      const createProgressBar = sandbox
        .stub(vsc_ui.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const createProject = sandbox.spy(globalVariables.core, "createProject");
      sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(globalState, "globalStateUpdate");
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
      };
      sandbox.stub(teamsDevPortalClient, "getApp").resolves(appDefinition);

      const res = await handlers.scaffoldFromDeveloperPortalHandler("appId", "testuser");

      chai.assert.equal(createProject.args[0][0].teamsAppFromTdp.teamsAppId, "mock-id");
      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(createProgressBar.calledOnce);
      chai.assert.isTrue(startProgress.calledOnce);
      chai.assert.isTrue(endProgress.calledOnceWithExactly(true));
    });
  });

  describe("openAppManagement", async () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("open link with loginHint", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(M365TokenInstance, "getStatus").resolves(
        ok({
          status: signedIn,
          token: undefined,
          accountInfo: { upn: "test" },
        })
      );
      const openUrl = sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));

      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      const res = await openAppManagement();

      chai.assert.isTrue(openUrl.calledOnce);
      chai.assert.isTrue(res.isOk());
      chai.assert.equal(openUrl.args[0][0], `${DeveloperPortalHomeLink}?login_hint=test`);
    });

    it("open link without loginHint", async () => {
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox.stub(M365TokenInstance, "getStatus").resolves(
        ok({
          status: signedOut,
          token: undefined,
          accountInfo: { upn: "test" },
        })
      );
      const openUrl = sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));

      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      const res = await openAppManagement();

      chai.assert.isTrue(openUrl.calledOnce);
      chai.assert.isTrue(res.isOk());
      chai.assert.equal(openUrl.args[0][0], DeveloperPortalHomeLink);
    });
  });

  describe("installAppInTeams", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").resolves();
      const result = await handlers.installAppInTeams();
      chai.assert.equal(result, undefined);
    });

    it("migration error", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").throws(err({ foo: "bar" } as any));
      sandbox.stub(errorCommon, "showError").resolves();
      const result = await handlers.installAppInTeams();
      chai.assert.equal(result, "1");
    });
  });

  describe("callBackFunctions", () => {
    it("signinAzureCallback", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
      const getIdentityCredentialStub = sandbox.stub(
        AzureAccountManager.prototype,
        "getIdentityCredentialAsync"
      );

      await handlers.signinAzureCallback([{}, { status: 0 }]);

      chai.assert.isTrue(getIdentityCredentialStub.calledOnce);
    });

    it("signinAzureCallback with error", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
      sandbox.stub(AzureAccountManager.prototype, "getIdentityCredentialAsync").throws(new Error());

      const res = await handlers.signinAzureCallback([{}, { status: 0 }]);

      chai.assert.isTrue(res.isErr());
    });

    it("signinAzureCallback with cancel error", async () => {
      sandbox.stub(AzureAccountManager.prototype, "getAccountInfo").returns({});
      sandbox
        .stub(AzureAccountManager.prototype, "getIdentityCredentialAsync")
        .throws(new UserCancelError(""));

      const res = await handlers.signinAzureCallback([{}, { status: 0 }]);

      chai.assert.isTrue(res.isOk());
    });
  });

  describe("validateAzureDependenciesHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").resolves();
      const result = await handlers.validateAzureDependenciesHandler();
      chai.assert.equal(result, undefined);
    });

    it("migration error", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").throws(err({ foo: "bar" } as any));
      sandbox.stub(errorCommon, "showError").resolves();
      const result = await handlers.validateAzureDependenciesHandler();
      chai.assert.equal(result, "1");
    });
  });

  describe("validateLocalPrerequisitesHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").resolves();
      const result = await handlers.validateLocalPrerequisitesHandler();
      chai.assert.equal(result, undefined);
    });

    it("migration error", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").throws(err({ foo: "bar" } as any));
      sandbox.stub(errorCommon, "showError").resolves();
      const result = await handlers.validateLocalPrerequisitesHandler();
      chai.assert.equal(result, "1");
    });
  });

  describe("backendExtensionsInstallHandler", () => {
    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").resolves();
      const result = await handlers.backendExtensionsInstallHandler();
      chai.assert.equal(result, undefined);
    });

    it("migration error", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").throws(err({ foo: "bar" } as any));
      sandbox.stub(errorCommon, "showError").resolves();
      const result = await handlers.backendExtensionsInstallHandler();
      chai.assert.equal(result, "1");
    });
  });

  describe("preDebugCheckHandler", () => {
    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").resolves();
      const result = await handlers.preDebugCheckHandler();
      chai.assert.equal(result, undefined);
    });

    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").throws(err({ foo: "bar" } as any));
      sandbox.stub(errorCommon, "showError").resolves();
      const result = await handlers.preDebugCheckHandler();
      chai.assert.equal(result, "1");
    });
  });

  describe("migrateTeamsTabAppHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsTabApp.upgrade")),
        selectFolder: () => Promise.resolve(ok({ type: "success", result: "test" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updatePackageJson").resolves(ok(true));
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updateCodes").resolves(ok([]));

      const result = await handlers.migrateTeamsTabAppHandler();

      chai.assert.deepEqual(result, ok(null));
    });

    it("happy path: failed files", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsTabApp.upgrade")),
        selectFolder: () => Promise.resolve(ok({ type: "success", result: "test" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      const warningStub = sandbox.stub(VsCodeLogInstance, "warning");
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updatePackageJson").resolves(ok(true));
      sandbox
        .stub(TeamsAppMigrationHandler.prototype, "updateCodes")
        .resolves(ok(["test1", "test2"]));

      const result = await handlers.migrateTeamsTabAppHandler();

      chai.assert.deepEqual(result, ok(null));
      chai.expect(warningStub.calledOnce).to.be.true;
    });

    it("error", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      const sendTelemetryErrorEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsTabApp.upgrade")),
        selectFolder: () => Promise.resolve(ok({ type: "success", result: "test" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updatePackageJson").resolves(ok(true));
      sandbox
        .stub(TeamsAppMigrationHandler.prototype, "updateCodes")
        .resolves(err({ foo: "bar" } as any));

      const result = await handlers.migrateTeamsTabAppHandler();

      chai.assert.isTrue(result.isErr());
      chai.expect(sendTelemetryErrorEventStub.calledOnce).to.be.true;
    });

    it("user cancel", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const sendTelemetryErrorEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsTabApp.upgrade")),
        selectFolder: () => Promise.resolve(ok({ type: "skip" })),
      });

      const result = await handlers.migrateTeamsTabAppHandler();

      chai.assert.deepEqual(result, ok(null));
      chai.expect(sendTelemetryErrorEventStub.calledOnce).to.be.true;
    });

    it("user cancel: skip folder selection", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const sendTelemetryErrorEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("cancel")),
      });

      const result = await handlers.migrateTeamsTabAppHandler();

      chai.assert.deepEqual(result, ok(null));
      chai.expect(sendTelemetryErrorEventStub.calledOnce).to.be.true;
    });

    it("no change in package.json", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsTabApp.upgrade")),
        selectFolder: () => Promise.resolve(ok({ type: "success", result: "test" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      sandbox.stub(VsCodeLogInstance, "warning").returns();
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updatePackageJson").resolves(ok(false));

      const result = await handlers.migrateTeamsTabAppHandler();

      chai.assert.deepEqual(result, ok(null));
    });
  });

  describe("migrateTeamsManifestHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsManifest.upgrade")),
        selectFile: () => Promise.resolve(ok({ type: "success", result: "test" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updateManifest").resolves(ok(null));

      const result = await handlers.migrateTeamsManifestHandler();

      chai.assert.deepEqual(result, ok(null));
    });

    it("user cancel: skip file selection", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      const sendTelemetryErrorEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsManifest.upgrade")),
        selectFile: () => Promise.resolve(ok({ type: "skip" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      sandbox.stub(TeamsAppMigrationHandler.prototype, "updateManifest").resolves(ok(null));

      const result = await handlers.migrateTeamsManifestHandler();

      chai.assert.deepEqual(result, ok(null));
      chai.expect(sendTelemetryErrorEventStub.calledOnce).to.be.true;
    });

    it("error", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").returns();
      sandbox.stub(localizeUtils, "localize").callsFake((key: string) => key);
      const sendTelemetryErrorEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const progressHandler = new ProgressHandler("title", 1);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        showMessage: () => Promise.resolve(ok("teamstoolkit.migrateTeamsManifest.upgrade")),
        selectFile: () => Promise.resolve(ok({ type: "success", result: "test" })),
        createProgressBar: () => progressHandler,
      });
      sandbox.stub(VsCodeLogInstance, "info").returns();
      sandbox
        .stub(TeamsAppMigrationHandler.prototype, "updateManifest")
        .resolves(err(new UserError("source", "name", "")));
      sandbox.stub(errorCommon, "showError").callsFake(async () => {});

      const result = await handlers.migrateTeamsManifestHandler();

      chai.assert.isTrue(result.isErr());
      chai.expect(sendTelemetryErrorEventStub.calledOnce).to.be.true;
    });
  });

  describe("openDocumentHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("opens upgrade guide when clicked from sidebar", async () => {
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const openUrl = sandbox.stub(vsc_ui.VS_CODE_UI, "openUrl").resolves(ok(true));

      await openDocumentHandler(extTelemetryEvents.TelemetryTriggerFrom.SideBar, "learnmore");

      chai.assert.isTrue(sendTelemetryStub.calledOnceWith("documentation"));
      chai.assert.isTrue(openUrl.calledOnceWith("https://aka.ms/teams-toolkit-5.0-upgrade"));
    });
  });

  describe("getPathDelimiterHandler", () => {
    it("happy path", async () => {
      const actualPath = await handlers.getPathDelimiterHandler();
      chai.assert.equal(actualPath, path.delimiter);
    });
  });
});

describe("autoOpenProjectHandler", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("openFolderHandler()", async () => {
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    const result = await handlers.openFolderHandler();

    chai.assert.isTrue(sendTelemetryStub.called);
    chai.assert.isTrue(result.isOk());
  });

  it("validateGetStartedPrerequisitesHandler() - error", async () => {
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox
      .stub(getStartedChecker, "checkPrerequisitesForGetStarted")
      .resolves(err(new SystemError("test", "test", "test")));

    const result = await handlers.validateGetStartedPrerequisitesHandler();

    chai.assert.isTrue(sendTelemetryStub.called);
    chai.assert.isTrue(result.isErr());
  });

  it("installAdaptiveCardExt()", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(vscode.extensions, "getExtension").returns(undefined);
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves("Install" as unknown as vscode.MessageItem);

    await handlers.installAdaptiveCardExt();

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  describe("acpInstalled()", () => {
    afterEach(() => {
      mockfs.restore();
      sandbox.restore();
    });

    it("already installed", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(vscode.extensions, "getExtension").returns({} as any);

      const installed = handlers.acpInstalled();

      chai.assert.isTrue(installed);
    });

    it("not installed", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(vscode.extensions, "getExtension").returns(undefined);

      const installed = handlers.acpInstalled();

      chai.assert.isFalse(installed);
    });
  });

  it("openLifecycleTreeview() - TeamsFx Project", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.openLifecycleTreeview();

    chai.assert.isTrue(executeCommandStub.calledWith("teamsfx-lifecycle.focus"));
  });

  it("openLifecycleTreeview() - non-TeamsFx Project", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.openLifecycleTreeview();

    chai.assert.isTrue(executeCommandStub.calledWith("workbench.view.extension.teamsfx"));
  });
});
