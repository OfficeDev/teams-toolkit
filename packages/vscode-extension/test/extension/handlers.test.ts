/**
 * @author HuihuiWu-Microsoft <73154171+HuihuiWu-Microsoft@users.noreply.github.com>
 */
import {
  ConfigFolderName,
  FxError,
  Inputs,
  ManifestUtil,
  OptionItem,
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
  CollaborationState,
  DepsManager,
  DepsType,
  UnhandledError,
  UserCancelError,
  environmentManager,
  featureFlagManager,
  manifestUtils,
  pathUtils,
  pluginManifestUtils,
  teamsDevPortalClient,
} from "@microsoft/teamsfx-core";
import * as globalState from "@microsoft/teamsfx-core/build/common/globalState";
import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import * as chai from "chai";
import * as fs from "fs-extra";
import * as mockfs from "mock-fs";
import * as path from "path";
import * as sinon from "sinon";
import * as uuid from "uuid";
import * as vscode from "vscode";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import VsCodeLogInstance, { VsCodeLogProvider } from "../../src/commonlib/log";
import M365TokenInstance, { M365Login } from "../../src/commonlib/m365Login";
import { DeveloperPortalHomeLink, GlobalKey } from "../../src/constants";
import { PanelType } from "../../src/controls/PanelType";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import * as debugConstants from "../../src/debug/common/debugConstants";
import * as getStartedChecker from "../../src/debug/depsChecker/getStartedChecker";
import * as launch from "../../src/debug/launch";
import * as runIconHandlers from "../../src/debug/runIconHandler";
import * as errorCommon from "../../src/error/common";
import { ExtensionErrors } from "../../src/error/error";
import { TreatmentVariableValue } from "../../src/exp/treatmentVariables";
import * as globalVariables from "../../src/globalVariables";
import * as handlers from "../../src/handlers";
import { TeamsAppMigrationHandler } from "../../src/migration/migrationHandler";
import { ProgressHandler } from "../../src/progressHandler";
import * as vsc_ui from "../../src/qm/vsc_ui";
import { VsCodeUI } from "../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as extTelemetryEvents from "../../src/telemetry/extTelemetryEvents";
import { TelemetryEvent } from "../../src/telemetry/extTelemetryEvents";
import envTreeProviderInstance from "../../src/treeview/environmentTreeViewProvider";
import TreeViewManagerInstance from "../../src/treeview/treeViewManager";
import * as appDefinitionUtils from "../../src/utils/appDefinitionUtils";
import { updateAutoOpenGlobalKey } from "../../src/utils/globalStateUtils";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as migrationUtils from "../../src/utils/migrationUtils";
import { ExtensionSurvey } from "../../src/utils/survey";
import * as systemEnvUtils from "../../src/utils/systemEnvUtils";
import * as telemetryUtils from "../../src/utils/telemetryUtils";
import { MockCore } from "../mocks/mockCore";
import {
  createNewProjectHandler,
  deployHandler,
  provisionHandler,
  publishHandler,
} from "../../src/handlers/lifecycleHandlers";
import { runCommand } from "../../src/handlers/sharedOpts";
import {
  openAppManagement,
  openDocumentHandler,
  openWelcomeHandler,
} from "../../src/handlers/openLinkHandlers";
import * as corePackage from "@microsoft/teamsfx-core";

describe("handlers", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("getSettingsVersion", async () => {
    sandbox.stub(globalVariables, "core").value(new MockCore());
    sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
    sandbox
      .stub(MockCore.prototype, "projectVersionCheck")
      .resolves(ok({ currentVersion: "3.0.0" }));
    const res = await handlers.getSettingsVersion();
    chai.assert.equal(res, "3.0.0");
  });

  it("addFileSystemWatcher detect SPFx project", async () => {
    const workspacePath = "test";
    const isValidProject = sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    const initGlobalVariables = sandbox.stub(globalVariables, "initializeGlobalVariables");
    const updateTreeViewsOnSPFxChanged = sandbox.stub(
      TreeViewManagerInstance,
      "updateTreeViewsOnSPFxChanged"
    );

    const watcher = {
      onDidCreate: () => ({ dispose: () => undefined }),
      onDidChange: () => ({ dispose: () => undefined }),
      onDidDelete: () => ({ dispose: () => undefined }),
    } as any;
    const createWatcher = sandbox
      .stub(vscode.workspace, "createFileSystemWatcher")
      .returns(watcher);
    const createListener = sandbox.stub(watcher, "onDidCreate").callsFake((...args: unknown[]) => {
      (args as any)[0]();
    });
    const changeListener = sandbox.stub(watcher, "onDidChange").callsFake((...args: unknown[]) => {
      (args as any)[0]();
    });
    const deleteListener = sandbox.stub(watcher, "onDidDelete").callsFake((...args: unknown[]) => {
      (args as any)[0]();
    });
    const sendTelemetryEventFunc = sandbox
      .stub(ExtTelemetry, "sendTelemetryEvent")
      .callsFake(() => {});

    handlers.addFileSystemWatcher(workspacePath);

    chai.assert.equal(createWatcher.callCount, 2);
    chai.assert.equal(createListener.callCount, 2);
    chai.assert.isTrue(changeListener.calledTwice);
  });

  it("addFileSystemWatcher in invalid project", async () => {
    const workspacePath = "test";
    const isValidProject = sandbox.stub(projectSettingsHelper, "isValidProject").returns(false);

    const watcher = {
      onDidCreate: () => ({ dispose: () => undefined }),
      onDidChange: () => ({ dispose: () => undefined }),
    } as any;
    const createWatcher = sandbox
      .stub(vscode.workspace, "createFileSystemWatcher")
      .returns(watcher);
    const createListener = sandbox.stub(watcher, "onDidCreate").resolves();
    const changeListener = sandbox.stub(watcher, "onDidChange").resolves();

    handlers.addFileSystemWatcher(workspacePath);

    chai.assert.isTrue(createWatcher.notCalled);
    chai.assert.isTrue(createListener.notCalled);
    chai.assert.isTrue(changeListener.notCalled);
  });

  it("sendSDKVersionTelemetry", async () => {
    const filePath = "test/package-lock.json";

    const readJsonFunc = sandbox.stub(fs, "readJson").resolves();
    const sendTelemetryEventFunc = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    handlers.sendSDKVersionTelemetry(filePath);

    chai.assert.isTrue(readJsonFunc.calledOnce);
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

    it("createNewProjectHandler()", async () => {
      const clock = sandbox.useFakeTimers();

      sandbox.stub(globalVariables, "core").value(new MockCore());
      const sendTelemetryEventFunc = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(globalVariables, "checkIsSPFx").returns(false);
      const createProject = sandbox.spy(globalVariables.core, "createProject");
      const executeCommandFunc = sandbox.stub(vscode.commands, "executeCommand");

      await createNewProjectHandler();

      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProjectStart)
      );
      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProject)
      );
      sinon.assert.calledOnce(createProject);
      chai.assert.isTrue(executeCommandFunc.calledOnceWith("vscode.openFolder"));
      clock.restore();
    });
    it("createNewProjectHandler() from copilot chat", async () => {
      const clock = sandbox.useFakeTimers();
      sandbox.stub(corePackage, "isValidOfficeAddInProject").returns(true);
      sandbox.stub(globalVariables, "core").value(new MockCore());
      const sendTelemetryEventFunc = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(globalVariables, "checkIsSPFx").returns(false);
      const createProject = sandbox.spy(globalVariables.core, "createProject");
      const executeCommandFunc = sandbox.stub(vscode.commands, "executeCommand");
      await createNewProjectHandler(["", { agent: "office" }]);

      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProjectStart)
      );
      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProject)
      );
      sinon.assert.calledOnce(createProject);
      clock.restore();
    });
    it("createNewProjectHandler - invoke Copilot", async () => {
      const mockCore = new MockCore();
      sandbox
        .stub(mockCore, "createProject")
        .resolves(ok({ projectPath: "", shouldInvokeTeamsAgent: true }));
      sandbox.stub(globalVariables, "core").value(mockCore);
      const sendTelemetryEventFunc = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(globalVariables, "checkIsSPFx").returns(false);
      sandbox.stub(vscode.extensions, "getExtension").returns({ name: "github.copilot" } as any);
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand").resolves();

      await createNewProjectHandler();

      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProjectStart)
      );
      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProject)
      );
      chai.assert.equal(executeCommandStub.callCount, 2);
      chai.assert.equal(executeCommandStub.args[0][0], "workbench.panel.chat.view.copilot.focus");
      chai.assert.equal(executeCommandStub.args[1][0], "workbench.action.chat.open");
    });

    it("provisionHandler()", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const provisionResources = sandbox.spy(globalVariables.core, "provisionResources");
      sandbox.stub(envTreeProviderInstance, "reloadEnvironments");

      await provisionHandler();

      sinon.assert.calledOnce(provisionResources);
    });

    it("deployHandler()", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const deployArtifacts = sandbox.spy(globalVariables.core, "deployArtifacts");

      await deployHandler();

      sinon.assert.calledOnce(deployArtifacts);
    });

    it("publishHandler()", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const publishApplication = sandbox.spy(globalVariables.core, "publishApplication");

      await publishHandler();

      sinon.assert.calledOnce(publishApplication);
    });

    it("buildPackageHandler()", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(globalVariables.core, "createAppPackage").resolves(err(new UserCancelError()));
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      await handlers.buildPackageHandler();

      // should show error for invalid project
      sinon.assert.calledOnce(sendTelemetryErrorEvent);
    });

    it("validateManifestHandler() - app package", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
      sandbox.stub(systemEnvUtils, "getSystemInputs").returns({} as Inputs);
      const validateApplication = sandbox.spy(globalVariables.core, "validateApplication");

      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => {
          return Promise.resolve(ok({ type: "success", result: "validateAgainstPackage" }));
        },
      });

      await handlers.validateManifestHandler();
      sinon.assert.calledOnce(validateApplication);
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

    it("selectTutorialsHandler()", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
      sandbox.stub(globalVariables, "isSPFxProject").value(false);
      let tutorialOptions: OptionItem[] = [];
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: (options: any) => {
          tutorialOptions = options.options;
          return Promise.resolve(ok({ type: "success", result: { id: "test", data: "data" } }));
        },
        openUrl: () => Promise.resolve(ok(true)),
      });

      const result = await handlers.selectTutorialsHandler();

      chai.assert.equal(tutorialOptions.length, 17);
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(tutorialOptions[1].data, "https://aka.ms/teamsfx-notification-new");
    });

    it("selectTutorialsHandler() for SPFx projects - v3", async () => {
      sandbox.stub(localizeUtils, "localize").returns("");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
      sandbox.stub(globalVariables, "isSPFxProject").value(true);
      let tutorialOptions: OptionItem[] = [];
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: (options: any) => {
          tutorialOptions = options.options;
          return Promise.resolve(ok({ type: "success", result: { id: "test", data: "data" } }));
        },
        openUrl: () => Promise.resolve(ok(true)),
      });

      const result = await handlers.selectTutorialsHandler();

      chai.assert.equal(tutorialOptions.length, 1);
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(tutorialOptions[0].data, "https://aka.ms/teamsfx-add-cicd-new");
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

    it("openConfigStateFile() - InvalidArgs", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: any = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, "projectSettings.json");
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });

      const res = await handlers.openConfigStateFile([]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.InvalidArgs);
      }
    });

    it("openConfigStateFile() - noOpenWorkspace", async () => {
      const env = "local";

      sandbox.stub(globalVariables, "workspaceUri").value({ fsPath: undefined });

      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });

      const res = await handlers.openConfigStateFile([]);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.NoWorkspaceError);
      }
    });

    it("openConfigStateFile() - invalidProject", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sandbox.stub(projectSettingsHelper, "isValidProject").returns(false);

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });

      const res = await handlers.openConfigStateFile([]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.InvalidProject);
      }
    });

    it("openConfigStateFile() - invalid target environment", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: any = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, "projectSettings.json");
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(err({ error: "invalid target env" })),
      });
      sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok([]));
      sandbox.stub(fs, "pathExists").resolves(false);
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok(env));

      const res = await handlers.openConfigStateFile([{ env: undefined, type: "env" }]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
      }
    });

    it("openConfigStateFile() - valid args", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: any = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, "projectSettings.json");
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok(env));
      sandbox.stub(fs, "pathExists").resolves(false);
      sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok([]));

      const res = await handlers.openConfigStateFile([{ env: undefined, type: "env" }]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.EnvFileNotFoundError);
      }
    });

    it("openConfigStateFile() - invalid env folder", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: any = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, "projectSettings.json");
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(err({ error: "unknown" } as any));
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(vscode.workspace, "openTextDocument").resolves("" as any);

      const res = await handlers.openConfigStateFile([{ env: env, type: "env" }]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
      }
    });

    it("openConfigStateFile() - success", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: any = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, "projectSettings.json");
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sandbox.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });
      sandbox.stub(pathUtils, "getEnvFolderPath").resolves(ok(env));
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(vscode.workspace, "openTextDocument").returns(Promise.resolve("" as any));

      const res = await handlers.openConfigStateFile([{ env: env, type: "env" }]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isOk());
      }
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

  it("openReadMeHandler", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
    const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
    sandbox
      .stub(vscode.workspace, "workspaceFolders")
      .value([{ uri: { fsPath: "readmeTestFolder" } }]);
    sandbox.stub(fs, "pathExists").resolves(true);
    const openTextDocumentStub = sandbox
      .stub(vscode.workspace, "openTextDocument")
      .resolves({} as any as vscode.TextDocument);

    await handlers.openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

    chai.assert.isTrue(openTextDocumentStub.calledOnce);
    chai.assert.isTrue(executeCommands.calledOnce);
  });

  it("openReadMeHandler - create project", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
    sandbox.stub(globalVariables, "core").value(undefined);
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Yes",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );
    await handlers.openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

    chai.assert.isTrue(showMessageStub.calledOnce);
  });

  it("openReadMeHandler - open folder", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(false);
    sandbox.stub(globalVariables, "core").value(undefined);
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Yes",
            run: (items[0] as any).run,
          } as vscode.MessageItem);
        }
      );
    await handlers.openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  it("openReadMeHandler - function notification bot template", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
    sandbox
      .stub(vscode.workspace, "workspaceFolders")
      .value([{ uri: { fsPath: "readmeTestFolder" } }]);
    sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves(Buffer.from("## Get Started with the Notification bot"));
    const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");

    await handlers.openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

    sandbox.assert.calledOnceWithExactly(
      createOrShow,
      PanelType.FunctionBasedNotificationBotReadme
    );
  });

  it("openReadMeHandler - restify notification bot template", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
    sandbox
      .stub(vscode.workspace, "workspaceFolders")
      .value([{ uri: { fsPath: "readmeTestFolder" } }]);
    sandbox.stub(TreatmentVariableValue, "inProductDoc").value(true);
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox
      .stub(fs, "readFile")
      .resolves(Buffer.from("## Get Started with the Notification bot restify"));
    const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");

    await handlers.openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

    sandbox.assert.calledOnceWithExactly(
      createOrShow,
      PanelType.RestifyServerNotificationBotReadme
    );
  });

  it("signOutM365", async () => {
    const signOut = sandbox.stub(M365TokenInstance, "signout").resolves(true);
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(envTreeProviderInstance, "reloadEnvironments");

    await handlers.signOutM365(false);

    sandbox.assert.calledOnce(signOut);
  });

  it("signOutAzure", async () => {
    Object.setPrototypeOf(AzureAccountManager, sandbox.stub());
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.signOutAzure(false);

    sandbox.assert.calledOnce(showMessageStub);
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

  describe("permission v3", function () {
    const sandbox = sinon.createSandbox();

    this.afterEach(() => {
      sandbox.restore();
    });

    it("happy path: grant permission", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "grantPermission" })),
      });
      sandbox.stub(MockCore.prototype, "grantPermission").returns(
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

      const result = await handlers.manageCollaboratorHandler("env");
      chai.expect(result.isOk()).equals(true);
    });

    it("happy path: list collaborator", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      sandbox.stub(MockCore.prototype, "listCollaborator").returns(
        Promise.resolve(
          ok({
            state: CollaborationState.OK,
            collaborators: [
              {
                userPrincipalName: "userPrincipalName",
                userObjectId: "userObjectId",
                isAadOwner: true,
                teamsAppResourceId: "teamsAppResourceId",
              },
            ],
          })
        )
      );
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });

      const result = await handlers.manageCollaboratorHandler("env");
      chai.expect(result.isOk()).equals(true);
    });

    it("happy path: list collaborator throws error", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      sandbox.stub(MockCore.prototype, "listCollaborator").throws(new Error("Error"));
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });

      const result = await handlers.manageCollaboratorHandler("env");
      chai.expect(result.isErr()).equals(true);
    });

    it("happy path: list collaborator throws login error", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      const showErrorMessageStub = sandbox.stub(vscode.window, "showErrorMessage");
      sandbox
        .stub(MockCore.prototype, "listCollaborator")
        .throws(new Error("Cannot get user login information"));
      const vscodeLogProviderInstance = VsCodeLogProvider.getInstance();
      sandbox.stub(vscodeLogProviderInstance, "outputChannel").value({
        name: "name",
        append: (value: string) => {},
        appendLine: (value: string) => {},
        replace: (value: string) => {},
        clear: () => {},
        show: (...params: any[]) => {},
        hide: () => {},
        dispose: () => {},
      });

      const result = await handlers.manageCollaboratorHandler("env");
      chai.expect(result.isErr()).equals(true);
      chai.assert.isTrue(showErrorMessageStub.called);
    });

    it("User Cancel", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value({
        selectOption: () =>
          Promise.resolve(err(new UserError("source", "errorName", "errorMessage"))),
      });

      const result = await handlers.manageCollaboratorHandler();
      chai.expect(result.isErr()).equals(true);
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

  it("deployAadAppmanifest", async () => {
    sandbox.stub(globalVariables, "core").value(new MockCore());
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    const deployAadManifest = sandbox.spy(globalVariables.core, "deployAadManifest");
    await handlers.updateAadAppManifest([{ fsPath: "path/aad.dev.template" }]);
    sandbox.assert.calledOnce(deployAadManifest);
    deployAadManifest.restore();
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

  describe("publishInDeveloperPortalHandler", async () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("publish in developer portal - success", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test.zip" }));
      const publish = sandbox.spy(globalVariables.core, "publishInDeveloperPortal");
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectOption")
        .resolves(ok({ type: "success", result: "test.zip" }));
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);

      const res = await handlers.publishInDeveloperPortalHandler();
      if (res.isErr()) {
        console.log(res.error);
      }
      chai.assert.isTrue(publish.calledOnce);
      chai.assert.isTrue(res.isOk());
    });

    it("publish in developer portal - cancelled", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox
        .stub(vsc_ui.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test2.zip" }));
      const publish = sandbox.spy(globalVariables.core, "publishInDeveloperPortal");
      sandbox.stub(vsc_ui.VS_CODE_UI, "selectOption").resolves(err(new UserCancelError("VSC")));
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);

      const res = await handlers.publishInDeveloperPortalHandler();
      if (res.isErr()) {
        console.log(res.error);
      }
      chai.assert.isTrue(publish.notCalled);
      chai.assert.isTrue(res.isOk());
    });

    it("select file error", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox.stub(vsc_ui.VS_CODE_UI, "selectFile").resolves(err(new UserCancelError("VSC")));
      const publish = sandbox.spy(globalVariables.core, "publishInDeveloperPortal");
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(vscode.commands, "executeCommand");
      sandbox.stub(fs, "pathExists").resolves(true);
      sandbox.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);

      const res = await handlers.publishInDeveloperPortalHandler();
      chai.assert.isTrue(res.isOk());
      chai.assert.isFalse(publish.calledOnce);
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

  it("refreshSPFxTreeOnFileChanged", () => {
    const initGlobalVariables = sandbox.stub(globalVariables, "initializeGlobalVariables");
    const updateTreeViewsOnSPFxChanged = sandbox
      .stub(TreeViewManagerInstance, "updateTreeViewsOnSPFxChanged")
      .resolves();

    handlers.refreshSPFxTreeOnFileChanged();

    chai.expect(initGlobalVariables.calledOnce).to.be.true;
    chai.expect(updateTreeViewsOnSPFxChanged.calledOnce).to.be.true;
  });

  describe("getPathDelimiterHandler", () => {
    it("happy path", async () => {
      const actualPath = await handlers.getPathDelimiterHandler();
      chai.assert.equal(actualPath, path.delimiter);
    });
  });

  describe("others", function () {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });

    it("cmpAccountsHandler", async () => {
      const showMessageStub = sandbox
        .stub(vscode.window, "showInformationMessage")
        .resolves(undefined);
      const M365SignOutStub = sandbox.stub(M365TokenInstance, "signout");
      sandbox
        .stub(M365TokenInstance, "getStatus")
        .resolves(ok({ status: "SignedIn", accountInfo: { upn: "test.email.com" } }));
      sandbox
        .stub(AzureAccountManager.prototype, "getStatus")
        .resolves({ status: "SignedIn", accountInfo: { upn: "test.email.com" } });
      let changeSelectionCallback: (e: readonly vscode.QuickPickItem[]) => any = () => {};
      const stubQuickPick = {
        items: [],
        onDidChangeSelection: (
          _changeSelectionCallback: (e: readonly vscode.QuickPickItem[]) => any
        ) => {
          changeSelectionCallback = _changeSelectionCallback;
          return {
            dispose: () => {},
          };
        },
        onDidHide: () => {
          return {
            dispose: () => {},
          };
        },
        show: () => {},
        hide: () => {},
        onDidAccept: () => {},
      };
      const hideStub = sandbox.stub(stubQuickPick, "hide");
      sandbox.stub(vscode.window, "createQuickPick").returns(stubQuickPick as any);
      sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sandbox.stub(vsc_ui.VS_CODE_UI, "selectOption").resolves(ok({ result: "unknown" } as any));

      await handlers.cmpAccountsHandler([]);
      changeSelectionCallback([stubQuickPick.items[1]]);

      for (const i of stubQuickPick.items) {
        await (i as any).function();
      }

      chai.assert.isTrue(showMessageStub.calledTwice);
      chai.assert.isTrue(M365SignOutStub.calledOnce);
      chai.assert.isTrue(hideStub.calledOnce);
    });

    it("updatePreviewManifest", async () => {
      sandbox.stub(globalVariables, "core").value(new MockCore());
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const openTextDocumentStub = sandbox
        .stub(vscode.workspace, "openTextDocument")
        .returns(Promise.resolve("" as any));

      await handlers.updatePreviewManifest([]);

      chai.assert.isTrue(openTextDocumentStub.calledOnce);
    });
  });
});

describe("openPreviewAadFile", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("manifest file not exists", async () => {
    const core = new MockCore();
    sandbox.stub(globalVariables, "core").value(core);
    sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    sandbox.stub(fs, "existsSync").returns(false);
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
    sandbox.stub(vsc_ui.VS_CODE_UI, "selectOption").resolves(
      ok({
        type: "success",
        result: "dev",
      })
    );
    sandbox.stub(handlers, "askTargetEnvironment").resolves(ok("dev"));
    sandbox.stub(errorCommon, "showError").callsFake(async () => {});
    sandbox.stub(globalVariables.core, "buildAadManifest").resolves(ok(undefined));
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent").resolves();
    const res = await handlers.openPreviewAadFile([]);
    chai.assert.isTrue(res.isErr());
  });

  it("happy path", async () => {
    const core = new MockCore();
    sandbox.stub(globalVariables, "core").value(core);
    sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    sandbox.stub(fs, "existsSync").returns(true);
    sandbox.stub(environmentManager, "listAllEnvConfigs").resolves(ok(["dev"]));
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
    sandbox.stub(vsc_ui.VS_CODE_UI, "selectOption").resolves(
      ok({
        type: "success",
        result: "dev",
      })
    );
    sandbox.stub(handlers, "askTargetEnvironment").resolves(ok("dev"));
    sandbox.stub(errorCommon, "showError").callsFake(async () => {});
    sandbox.stub(globalVariables.core, "buildAadManifest").resolves(ok(undefined));
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent").resolves();
    sandbox.stub(vscode.workspace, "openTextDocument").resolves();
    sandbox.stub(vscode.window, "showTextDocument").resolves();

    const res = await handlers.openPreviewAadFile([]);
    chai.assert.isTrue(res.isOk());
  });
});

describe("editAadManifestTemplate", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("happy path", async () => {
    const workspacePath = "/test/workspace/path";
    const workspaceUri = vscode.Uri.file(workspacePath);
    sandbox.stub(globalVariables, "workspaceUri").value(workspaceUri);

    const openTextDocumentStub = sandbox
      .stub(vscode.workspace, "openTextDocument")
      .resolves({} as any);
    const showTextDocumentStub = sandbox.stub(vscode.window, "showTextDocument");

    await handlers.editAadManifestTemplate([null, "testTrigger"]);

    sandbox.assert.calledOnceWithExactly(
      openTextDocumentStub as any,
      `${workspaceUri.fsPath}/aad.manifest.json`
    );
  });

  it("happy path: no parameter", async () => {
    const workspacePath = "/test/workspace/path";
    const workspaceUri = vscode.Uri.file(workspacePath);
    sandbox.stub(globalVariables, "workspaceUri").value(workspaceUri);

    const openTextDocumentStub = sandbox
      .stub(vscode.workspace, "openTextDocument")
      .resolves({} as any);
    const showTextDocumentStub = sandbox.stub(vscode.window, "showTextDocument");

    await handlers.editAadManifestTemplate([]);

    chai.assert.isTrue(showTextDocumentStub.callCount === 0);
  });

  it("happy path: workspaceUri is undefined", async () => {
    const workspaceUri = undefined;
    sandbox.stub(globalVariables, "workspaceUri").value(undefined);

    const openTextDocumentStub = sandbox
      .stub(vscode.workspace, "openTextDocument")
      .resolves({} as any);
    const showTextDocumentStub = sandbox.stub(vscode.window, "showTextDocument");

    await handlers.editAadManifestTemplate([null, "testTrigger"]);

    sandbox.assert.calledOnceWithExactly(
      openTextDocumentStub as any,
      `${workspaceUri}/aad.manifest.json`
    );
  });
});

describe("autoOpenProjectHandler", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("opens walk through", async () => {
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openWalkThrough") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const executeCommandFunc = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendTelemetryStub.calledOnce);
    chai.assert.isTrue(executeCommandFunc.calledOnce);
  });

  it("opens walk through if workspace Uri exists", async () => {
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openWalkThrough") {
        return true;
      } else {
        return false;
      }
    });
    const globalStateUpdateStub = sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.parse("test"));
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const executeCommandFunc = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendTelemetryStub.calledOnce);
    chai.assert.isTrue(executeCommandFunc.calledOnce);
    chai.assert.isTrue(globalStateUpdateStub.calledTwice);
  });

  it("opens README", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openReadMe") {
        return vscode.Uri.file("test").fsPath;
      } else {
        return "";
      }
    });
    sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({} as any));
    sandbox.stub(ManifestUtil, "parseCommonProperties").resolves({ isCopilotPlugin: false });
    sandbox.stub(globalState, "globalStateUpdate");
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendTelemetryStub.calledOnce);
  });

  it("opens sample README", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    const showMessageStub = sandbox.stub(vscode.window, "showInformationMessage");
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openSampleReadMe") {
        return true;
      } else {
        return "";
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  it("opens README and show APIE ME warnings successfully", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openReadMe") {
        return vscode.Uri.file("test").fsPath;
      } else if (key === GlobalKey.CreateWarnings) {
        return JSON.stringify([{ type: "type", content: "content" }]);
      } else {
        return "";
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");

    sandbox.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        name: { short: "short", full: "full" },
        description: { short: "short", full: "" },
        composeExtensions: [{ commands: [{ id: "command1" }] }],
      } as any)
    );
    const parseRes = {
      id: "",
      version: "",
      capabilities: [""],
      manifestVersion: "",
      isApiME: true,
      isSPFx: false,
      isApiMeAAD: false,
    };
    const parseManifestStub = sandbox.stub(ManifestUtil, "parseCommonProperties").returns(parseRes);
    VsCodeLogInstance.outputChannel = {
      show: () => {},
      info: () => {},
    } as unknown as vscode.OutputChannel;
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendTelemetryStub.calledTwice);
    chai.assert.isTrue(parseManifestStub.called);
  });

  it("opens README and show copilot plugin warnings successfully", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    sandbox.stub(vscode.window, "showInformationMessage").resolves(undefined);
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openReadMe") {
        return vscode.Uri.file("test").fsPath;
      } else if (key === GlobalKey.CreateWarnings) {
        return JSON.stringify([{ type: "type", content: "content" }]);
      } else {
        return "";
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(path, "relative").returns("test");

    sandbox.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        name: { short: "short", full: "full" },
        description: { short: "short", full: "" },
        copilotExtensions: { plugins: [{ file: "ai-plugin.json", id: "plugin1" }] },
      } as any)
    );
    const parseRes = {
      id: "",
      version: "",
      capabilities: ["plugin"],
      manifestVersion: "",
      isApiME: false,
      isSPFx: false,
      isApiMeAAD: false,
    };
    const parseManifestStub = sandbox.stub(ManifestUtil, "parseCommonProperties").returns(parseRes);
    const getApiSpecStub = sandbox
      .stub(pluginManifestUtils, "getApiSpecFilePathFromTeamsManifest")
      .resolves(ok(["test"]));
    VsCodeLogInstance.outputChannel = {
      show: () => {},
      info: () => {},
    } as unknown as vscode.OutputChannel;
    const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendTelemetryStub.calledTwice);
    chai.assert.isTrue(parseManifestStub.called);
    chai.assert.isTrue(getApiSpecStub.called);
  });
  it("skip show warnings if parsing error", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openReadMe") {
        return vscode.Uri.file("test").fsPath;
      } else if (key === GlobalKey.CreateWarnings) {
        return "string";
      } else {
        return "";
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const sendErrorTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendErrorTelemetryStub.called);
  });

  it("skip show warnings if cannot get manifest", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openReadMe") {
        return vscode.Uri.file("test").fsPath;
      } else if (key === GlobalKey.CreateWarnings) {
        return "string";
      } else {
        return "";
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox
      .stub(manifestUtils, "_readAppManifest")
      .resolves(err(new UserError("source", "name", "", "")));

    const sendErrorTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendErrorTelemetryStub.called);
  });

  it("skip show warnings if get plugin api spec error", async () => {
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    sandbox.stub(globalVariables, "isTeamsFxProject").resolves(false);
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "fx-extension.openReadMe") {
        return vscode.Uri.file("test").fsPath;
      } else if (key === GlobalKey.CreateWarnings) {
        return JSON.stringify([{ type: "type", content: "content" }]);
      } else {
        return "";
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");

    sandbox.stub(manifestUtils, "_readAppManifest").resolves(
      ok({
        name: { short: "short", full: "full" },
        description: { short: "short", full: "" },
        copilotExtensions: { plugins: [{ file: "ai-plugin.json", id: "plugin1" }] },
      } as any)
    );
    const parseRes = {
      id: "",
      version: "",
      capabilities: ["plugin"],
      manifestVersion: "",
      isApiME: false,
      isSPFx: false,
      isApiBasedMe: true,
      isApiMeAAD: false,
    };
    sandbox.stub(ManifestUtil, "parseCommonProperties").returns(parseRes);
    const getApiSpecStub = sandbox
      .stub(pluginManifestUtils, "getApiSpecFilePathFromTeamsManifest")
      .resolves(err(new SystemError("test", "test", "", "")));
    VsCodeLogInstance.outputChannel = {
      show: () => {},
      info: () => {},
    } as unknown as vscode.OutputChannel;
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    const sendErrorTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(sendErrorTelemetryStub.called);
    chai.assert.equal(
      sendErrorTelemetryStub.args[0][0],
      TelemetryEvent.ShowScaffoldingWarningSummaryError
    );
    chai.assert.isTrue(getApiSpecStub.called);
  });

  it("auto install dependency", async () => {
    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "teamsToolkit:autoInstallDependency") {
        return true;
      } else {
        return false;
      }
    });
    const globalStateStub = sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(vsc_ui, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
    const runCommandStub = sandbox.stub(vsc_ui.VS_CODE_UI, "runCommand");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.autoOpenProjectHandler();

    chai.assert.isTrue(globalStateStub.calledWith("teamsToolkit:autoInstallDependency", false));
    chai.assert.isTrue(runCommandStub.calledOnce);
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

  it("registerAccountMenuCommands() - signedinM365", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox
      .stub(vscode.commands, "registerCommand")
      .callsFake((command: string, callback: (...args: any[]) => any) => {
        callback({ contextValue: "signedinM365" }).then(() => {});
        return {
          dispose: () => {},
        };
      });
    sandbox.stub(vscode.extensions, "getExtension");
    const signoutStub = sandbox.stub(M365TokenInstance, "signout");

    await handlers.registerAccountMenuCommands({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    chai.assert.isTrue(signoutStub.called);
  });

  it("registerAccountMenuCommands() - signedinAzure", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox
      .stub(vscode.commands, "registerCommand")
      .callsFake((command: string, callback: (...args: any[]) => any) => {
        callback({ contextValue: "signedinAzure" }).then(() => {});
        return {
          dispose: () => {},
        };
      });
    sandbox.stub(vscode.extensions, "getExtension");
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .resolves(undefined);

    await handlers.registerAccountMenuCommands({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    chai.assert.isTrue(showMessageStub.called);
  });

  it("registerAccountMenuCommands() - error", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox
      .stub(vscode.commands, "registerCommand")
      .callsFake((command: string, callback: (...args: any[]) => any) => {
        callback({ contextValue: "signedinM365" }).then(() => {});
        return {
          dispose: () => {},
        };
      });
    sandbox.stub(vscode.extensions, "getExtension");
    const signoutStub = sandbox.stub(M365Login.prototype, "signout").throws(new UserCancelError());

    await handlers.registerAccountMenuCommands({
      subscriptions: [],
    } as unknown as vscode.ExtensionContext);

    chai.assert.isTrue(signoutStub.called);
  });

  it("openSampleReadmeHandler() - trigger from walkthrough", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.openSampleReadmeHandler(["WalkThrough"]);

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  it("showLocalDebugMessage() - has local env", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(true);
    const runLocalDebug = sandbox.stub(runIconHandlers, "selectAndDebug").resolves(ok(null));

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Debug",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );

    await handlers.showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.calledOnce);
    chai.assert.isTrue(runLocalDebug.called);
  });

  it("showLocalDebugMessage() - local env and non windows", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("linux");
    sandbox.stub(fs, "pathExists").resolves(true);
    const runLocalDebug = sandbox.stub(runIconHandlers, "selectAndDebug").resolves(ok(null));

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Not Debug",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );

    await handlers.showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.calledOnce);
    chai.assert.isFalse(runLocalDebug.called);
  });

  it("showLocalDebugMessage() - has local env and not click debug", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(true);
    const runLocalDebug = sandbox.stub(runIconHandlers, "selectAndDebug").resolves(ok(null));

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve(undefined);
        }
      );

    await handlers.showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.calledOnce);
    chai.assert.isFalse(runLocalDebug.called);
  });

  it("showLocalDebugMessage() - no local env", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(false);

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Provision",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.called);
    chai.assert.isTrue(executeCommandStub.called);
  });

  it("showLocalDebugMessage() - no local env and non windows", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(appDefinitionUtils, "getAppName").resolves("");
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("linux");
    sandbox.stub(fs, "pathExists").resolves(false);

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve({
            title: "Not provision",
            run: (options as any).run,
          } as vscode.MessageItem);
        }
      );
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.called);
    chai.assert.isTrue(executeCommandStub.notCalled);
  });

  it("showLocalDebugMessage() - no local env and not click provision", async () => {
    sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
    sandbox.stub(vscode.workspace, "openTextDocument");
    sandbox.stub(process, "platform").value("win32");
    sandbox.stub(fs, "pathExists").resolves(false);

    sandbox.stub(globalState, "globalStateGet").callsFake(async (key: string) => {
      if (key === "ShowLocalDebugMessage") {
        return true;
      } else {
        return false;
      }
    });
    sandbox.stub(globalState, "globalStateUpdate");
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
    const showMessageStub = sandbox
      .stub(vscode.window, "showInformationMessage")
      .callsFake(
        (title: string, options: vscode.MessageOptions, ...items: vscode.MessageItem[]) => {
          return Promise.resolve(undefined);
        }
      );
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.showLocalDebugMessage();

    chai.assert.isTrue(showMessageStub.called);
    chai.assert.isFalse(executeCommandStub.called);
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

  it("signInAzure()", async () => {
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.signInAzure();

    chai.assert.isTrue(executeCommandStub.calledOnce);
  });

  it("signInM365()", async () => {
    const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

    await handlers.signInM365();

    chai.assert.isTrue(executeCommandStub.calledOnce);
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
