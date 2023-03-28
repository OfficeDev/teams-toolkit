/**
 * @author HuihuiWu-Microsoft <73154171+HuihuiWu-Microsoft@users.noreply.github.com>
 */
import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import * as sinon from "sinon";
import { stubInterface } from "ts-sinon";
import * as util from "util";
import * as uuid from "uuid";
import * as vscode from "vscode";

import {
  ConfigFolderName,
  err,
  FxError,
  Inputs,
  IProgressHandler,
  ok,
  Platform,
  ProjectSettings,
  ProjectSettingsFileName,
  Result,
  Stage,
  UserError,
  Void,
  VsCodeEnv,
  UserCancelError,
  OptionItem,
  TeamsAppManifest,
  QTreeNode,
} from "@microsoft/teamsfx-api";
import { DepsManager, DepsType } from "@microsoft/teamsfx-core/build/common/deps-checker";
import * as globalState from "@microsoft/teamsfx-core/build/common/globalState";
import { CollaborationState } from "@microsoft/teamsfx-core/build/common/permissionInterface";
import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { CoreHookContext } from "@microsoft/teamsfx-core/build/core/types";
import * as StringResources from "../../package.nls.json";
import { AzureAccountManager } from "../../src/commonlib/azureLogin";
import M365TokenInstance from "../../src/commonlib/m365Login";
import { DeveloperPortalHomeLink, SUPPORTED_SPFX_VERSION } from "../../src/constants";
import { PanelType } from "../../src/controls/PanelType";
import { WebviewPanel } from "../../src/controls/webviewPanel";
import * as debugCommonUtils from "../../src/debug/commonUtils";
import * as teamsAppInstallation from "../../src/debug/teamsAppInstallation";
import { vscodeHelper } from "../../src/debug/depsChecker/vscodeHelper";
import * as debugProvider from "../../src/debug/teamsfxDebugProvider";
import * as taskHandler from "../../src/debug/teamsfxTaskHandler";
import { ExtensionErrors } from "../../src/error";
import * as extension from "../../src/extension";
import * as globalVariables from "../../src/globalVariables";
import * as handlers from "../../src/handlers";
import { VsCodeUI } from "../../src/qm/vsc_ui";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as extTelemetryEvents from "../../src/telemetry/extTelemetryEvents";
import accountTreeViewProviderInstance from "../../src/treeview/account/accountTreeViewProvider";
import envTreeProviderInstance from "../../src/treeview/environmentTreeViewProvider";
import TreeViewManagerInstance from "../../src/treeview/treeViewManager";
import * as commonUtils from "../../src/utils/commonUtils";
import * as localizeUtils from "../../src/utils/localizeUtils";
import { MockCore } from "../mocks/mockCore";
import * as commonTools from "@microsoft/teamsfx-core/build/common/tools";
import { VsCodeLogProvider } from "../../src/commonlib/log";
import { ProgressHandler } from "../../src/progressHandler";
import { TreatmentVariableValue } from "../../src/exp/treatmentVariables";
import { AppStudioClient } from "@microsoft/teamsfx-core/build/component/resource/appManifest/appStudioClient";
import { AppDefinition } from "@microsoft/teamsfx-core/build/component/resource/appManifest/interfaces/appDefinition";
import { VSCodeDepsChecker } from "../../src/debug/depsChecker/vscodeChecker";
import { signedIn, signedOut } from "../../src/commonlib/common/constant";
import { ExtensionSurvey } from "../../src/utils/survey";
import { pathUtils } from "@microsoft/teamsfx-core/build/component/utils/pathUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { FileNotFoundError } from "@microsoft/teamsfx-core/build/error/common";
import * as question from "@microsoft/teamsfx-core/build/core/question";
import * as visitor from "@microsoft/teamsfx-api/build/qm/visitor";
import { envUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";
import { manifestUtils } from "@microsoft/teamsfx-core/build/component/resource/appManifest/utils/ManifestUtils";
import { PackageService } from "@microsoft/teamsfx-core/build/common/m365/packageService";
import * as launch from "../../src/debug/launch";

describe("handlers", () => {
  describe("activate()", function () {
    const sandbox = sinon.createSandbox();
    let setStatusChangeMap: any;

    beforeEach(() => {
      sandbox.stub(accountTreeViewProviderInstance, "subscribeToStatusChanges");
      sandbox.stub(vscode.extensions, "getExtension").returns(undefined);
      sandbox.stub(TreeViewManagerInstance, "getTreeView").returns(undefined);
      sandbox.stub(ExtTelemetry, "dispose");
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("No globalState error", async () => {
      const result = await handlers.activate();
      chai.assert.deepEqual(result.isOk() ? result.value : result.error.name, {});
    });

    it("Valid project", async () => {
      sandbox.stub(commonTools, "isV3Enabled").returns(false);
      sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      const addSharedPropertyStub = sandbox.stub(ExtTelemetry, "addSharedProperty");
      const result = await handlers.activate();

      chai.assert.isTrue(addSharedPropertyStub.called);
      chai.assert.isTrue(sendTelemetryStub.calledOnceWith("open-teams-app"));
      chai.assert.deepEqual(result.isOk() ? result.value : result.error.name, {});
    });
  });
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("getSystemInputs()", () => {
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    const input: Inputs = handlers.getSystemInputs();

    chai.expect(input.platform).equals(Platform.VSCode);
  });

  it("getAzureProjectConfigV3", async () => {
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    sandbox.stub(handlers, "core").value(new MockCore());
    sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
    const fake_config_v3 = {
      projectSettings: {
        appName: "fake_test",
        projectId: "fake_projectId",
      },
      envInfos: {},
    };
    sandbox.stub(MockCore.prototype, "getProjectConfigV3").resolves(ok(fake_config_v3));
    const res = await handlers.getAzureProjectConfigV3();
    chai.assert.exists(res?.projectSettings);
    chai.assert.equal(res?.projectSettings.appName, "fake_test");
    chai.assert.equal(res?.projectSettings.projectId, "fake_projectId");
  });

  it("getAzureProjectConfigV3 return undefined", async () => {
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    sandbox.stub(handlers, "core").value(new MockCore());
    sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
    sandbox
      .stub(MockCore.prototype, "getProjectConfigV3")
      .resolves(err(new FileNotFoundError("path not exist", "fake path")));
    const res = await handlers.getAzureProjectConfigV3();
    chai.assert.isUndefined(res);
  });

  it("getSettingsVersion in v3", async () => {
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox.stub(handlers, "core").value(new MockCore());
    sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
    sandbox
      .stub(MockCore.prototype, "projectVersionCheck")
      .resolves(ok({ currentVersion: "3.0.0" }));
    const res = await handlers.getSettingsVersion();
    chai.assert.equal(res, "3.0.0");
  });

  it("openBackupConfigMd", async () => {
    const workspacePath = "test";
    const filePath = path.join(workspacePath, ".backup", "backup-config-change-logs.md");

    const openTextDocument = sandbox.stub(vscode.workspace, "openTextDocument").resolves();
    const executeCommand = sandbox.stub(vscode.commands, "executeCommand").resolves();

    await handlers.openBackupConfigMd(workspacePath, filePath);

    chai.assert.isTrue(openTextDocument.calledOnce);
    chai.assert.isTrue(
      executeCommand.calledOnceWithExactly("markdown.showPreview", vscode.Uri.file(filePath))
    );
  });

  it("addFileSystemWatcher in valid project", async () => {
    const workspacePath = "test";
    const isValidProject = sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    const isV3Enabled = sandbox.stub(commonTools, "isV3Enabled").returns(false);
    const watcher = {
      onDidCreate: () => ({ dispose: () => undefined }),
      onDidChange: () => ({ dispose: () => undefined }),
    } as any;
    const createWatcher = sandbox
      .stub(vscode.workspace, "createFileSystemWatcher")
      .returns(watcher);
    const createListener = sandbox.stub(watcher, "onDidCreate").resolves();
    const changeListener = sandbox.stub(watcher, "onDidChange").resolves();
    const sendTelemetryEventFunc = sandbox
      .stub(ExtTelemetry, "sendTelemetryEvent")
      .callsFake(() => {});

    handlers.addFileSystemWatcher(workspacePath);

    chai.assert.isTrue(createWatcher.calledThrice);
    chai.assert.isTrue(createListener.calledThrice);
    chai.assert.isTrue(changeListener.calledOnce);
  });

  it("addFileSystemWatcher detect SPFx project", async () => {
    const workspacePath = "test";
    const isValidProject = sandbox.stub(projectSettingsHelper, "isValidProject").returns(true);
    const isV3Enabled = sandbox.stub(commonTools, "isV3Enabled").returns(true);

    const watcher = {
      onDidCreate: () => ({ dispose: () => undefined }),
      onDidChange: () => ({ dispose: () => undefined }),
      onDidDelete: () => ({ dispose: () => undefined }),
    } as any;
    const createWatcher = sandbox
      .stub(vscode.workspace, "createFileSystemWatcher")
      .returns(watcher);
    const createListener = sandbox.stub(watcher, "onDidCreate").resolves();
    const changeListener = sandbox.stub(watcher, "onDidChange").resolves();
    const deleteListener = sandbox.stub(watcher, "onDidDelete").resolves();
    const sendTelemetryEventFunc = sandbox
      .stub(ExtTelemetry, "sendTelemetryEvent")
      .callsFake(() => {});

    handlers.addFileSystemWatcher(workspacePath);

    chai.assert.equal(createWatcher.callCount, 4);
    chai.assert.equal(createListener.callCount, 4);
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

    chai.assert.isTrue(createWatcher.calledTwice);
    chai.assert.isTrue(createListener.calledTwice);
    chai.assert.isTrue(changeListener.notCalled);
  });

  it("sendSDKVersionTelemetry", async () => {
    const filePath = "test/package-lock.json";

    const readJsonFunc = sandbox.stub(fs, "readJson").resolves();
    const sendTelemetryEventFunc = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    handlers.sendSDKVersionTelemetry(filePath);

    chai.assert.isTrue(readJsonFunc.calledOnce);
  });

  describe("command handlers", function () {
    this.afterEach(() => {
      sinon.restore();
    });

    it("createNewProjectHandler()", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      const clock = sinon.useFakeTimers();

      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(commonUtils, "isExistingTabApp").returns(Promise.resolve(false));
      const sendTelemetryEventFunc = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createProject = sinon.spy(handlers.core, "createProject");
      const executeCommandFunc = sinon.stub(vscode.commands, "executeCommand");
      const globalStateUpdateStub = sinon.stub(globalState, "globalStateUpdate");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.createNewProjectHandler();

      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProjectStart)
      );
      chai.assert.isTrue(
        sendTelemetryEventFunc.calledWith(extTelemetryEvents.TelemetryEvent.CreateProject)
      );
      sinon.assert.calledOnce(createProject);
      chai.assert.isTrue(executeCommandFunc.calledOnceWith("vscode.openFolder"));
      sinon.restore();
      clock.restore();
    });

    it("provisionHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const provisionResources = sinon.spy(handlers.core, "provisionResources");
      sinon.stub(envTreeProviderInstance, "reloadEnvironments");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.provisionHandler();

      sinon.assert.calledOnce(provisionResources);
      sinon.restore();
    });

    it("deployHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const deployArtifacts = sinon.spy(handlers.core, "deployArtifacts");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.deployHandler();

      sinon.assert.calledOnce(deployArtifacts);
      sinon.restore();
    });

    it("publishHandler()", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const publishApplication = sinon.spy(handlers.core, "publishApplication");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.publishHandler();

      sinon.assert.calledOnce(publishApplication);
      sinon.restore();
    });

    it("buildPackageHandler()", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      await handlers.buildPackageHandler();

      // should show error for invalid project
      sinon.assert.calledOnce(sendTelemetryErrorEvent);
      sinon.restore();
    });

    it("validateManifestHandler() - app package", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(projectSettingsHelper, "isValidProject").returns(true);
      sinon.stub(handlers, "getSystemInputs").returns({} as Inputs);
      sinon.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      const validateApplication = sinon.spy(handlers.core, "validateApplication");

      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: () => {
          return Promise.resolve(ok({ type: "success", result: "validateAgainstPackage" }));
        },
      });

      await handlers.validateManifestHandler();
      sinon.assert.calledOnce(validateApplication);
    });

    it("validateManifestHandler() - user cancel", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(localizeUtils, "localize").returns("");

      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: (options: any) => {
          return Promise.resolve(err(new Error("User cancel")));
        },
      });

      const res = await handlers.validateManifestHandler();

      chai.assert(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.message, "User cancel");
      }
      sinon.restore();
    });

    it("debugHandler()", async () => {
      const sendTelemetryEventStub = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const executeCommandStub = sinon.stub(vscode.commands, "executeCommand");

      await handlers.debugHandler();

      sinon.assert.calledOnceWithExactly(executeCommandStub, "workbench.action.debug.start");
      sinon.assert.calledOnce(sendTelemetryEventStub);
      sinon.restore();
    });

    it("treeViewPreviewHandler() - Teams", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      sandbox.stub(question, "selectTeamsAppManifestQuestion").returns({} as any);
      sandbox.stub(visitor, "traverse").callsFake(async (node, inputs, ui) => {
        inputs["hub"] = "Teams";
        inputs["manifest-path"] = "/path/to/manifest";
        return ok(Void);
      });
      const mockProgressHandler = stubInterface<IProgressHandler>();
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon.stub(VsCodeUI.prototype, "createProgressBar").returns(mockProgressHandler);
      sandbox.stub(envUtil, "readEnv").returns(Promise.resolve(ok({})));
      sandbox
        .stub(manifestUtils, "getManifestV3")
        .returns(Promise.resolve(ok(new TeamsAppManifest())));
      sandbox.stub(launch, "openHubWebClient").returns(Promise.resolve());

      const result = await handlers.treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isOk());
    });

    it("treeViewPreviewHandler() - Outlook", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      sandbox.stub(question, "selectTeamsAppManifestQuestion").returns({} as any);
      sandbox.stub(visitor, "traverse").callsFake(async (node, inputs, ui) => {
        inputs["hub"] = "Outlook";
        inputs["manifest-path"] = "/path/to/manifest";
        return ok(Void);
      });
      const mockProgressHandler = stubInterface<IProgressHandler>();
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon.stub(VsCodeUI.prototype, "createProgressBar").returns(mockProgressHandler);
      sandbox.stub(envUtil, "readEnv").returns(Promise.resolve(ok({})));
      sandbox
        .stub(manifestUtils, "getManifestV3")
        .returns(Promise.resolve(ok(new TeamsAppManifest())));
      sandbox.stub(M365TokenInstance, "getAccessToken").returns(Promise.resolve(ok("")));
      sandbox.stub(launch, "openHubWebClient").returns(Promise.resolve());
      sandbox
        .stub(PackageService.prototype, "retrieveAppId")
        .returns(Promise.resolve("test-app-id"));

      const result = await handlers.treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isOk());
    });

    it("treeViewPreviewHandler() - Outlook: title unacquired", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      sandbox.stub(question, "selectTeamsAppManifestQuestion").returns({} as any);
      sandbox.stub(visitor, "traverse").callsFake(async (node, inputs, ui) => {
        inputs["hub"] = "Outlook";
        inputs["manifest-path"] = "/path/to/manifest";
        return ok(Void);
      });
      const mockProgressHandler = stubInterface<IProgressHandler>();
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon.stub(VsCodeUI.prototype, "createProgressBar").returns(mockProgressHandler);
      sandbox.stub(envUtil, "readEnv").returns(Promise.resolve(ok({})));
      sandbox
        .stub(manifestUtils, "getManifestV3")
        .returns(Promise.resolve(ok(new TeamsAppManifest())));
      sandbox.stub(M365TokenInstance, "getAccessToken").returns(Promise.resolve(ok("")));
      sandbox.stub(launch, "openHubWebClient").returns(Promise.resolve());
      sandbox.stub(PackageService.prototype, "retrieveAppId").returns(Promise.resolve(undefined));
      sinon.stub(handlers, "showError").callsFake(async () => {});

      const result = await handlers.treeViewPreviewHandler("dev");

      chai.assert.isTrue(result.isErr());
    });

    it("selectTutorialsHandler() - v2", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(TreatmentVariableValue, "inProductDoc").value(true);
      let tutorialOptions: OptionItem[] = [];
      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: (options: any) => {
          tutorialOptions = options.options;
          return Promise.resolve(ok({ type: "success", result: { id: "test", data: "data" } }));
        },
        openUrl: () => Promise.resolve(ok(true)),
      });

      const result = await handlers.selectTutorialsHandler();

      chai.assert.equal(tutorialOptions.length, 6);
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(tutorialOptions[0].data, "https://aka.ms/teamsfx-card-action-response");
    });

    it("selectTutorialsHandler() - v3", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(TreatmentVariableValue, "inProductDoc").value(true);
      sinon.stub(globalVariables, "isSPFxProject").value(false);
      let tutorialOptions: OptionItem[] = [];
      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: (options: any) => {
          tutorialOptions = options.options;
          return Promise.resolve(ok({ type: "success", result: { id: "test", data: "data" } }));
        },
        openUrl: () => Promise.resolve(ok(true)),
      });

      const result = await handlers.selectTutorialsHandler();

      chai.assert.equal(tutorialOptions.length, 15);
      chai.assert.isTrue(result.isOk());
      chai.assert.equal(tutorialOptions[1].data, "https://aka.ms/teamsfx-notification-new");
    });

    it("selectTutorialsHandler() for SPFx projects - v3", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(TreatmentVariableValue, "inProductDoc").value(true);
      sinon.stub(globalVariables, "isSPFxProject").value(true);
      let tutorialOptions: OptionItem[] = [];
      sinon.stub(extension, "VS_CODE_UI").value({
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

  it("openAccountHelpHandler()", async () => {
    const createOrShow = sandbox.stub(WebviewPanel, "createOrShow");
    await handlers.openAccountHelpHandler();
    sandbox.assert.calledOnceWithExactly(createOrShow, PanelType.AccountHelp);
  });

  describe("runCommand()", function () {
    this.afterEach(() => {
      sinon.restore();
    });

    it("openConfigStateFile() - local", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(localizeUtils, "localize").callsFake((key: string) => {
        return key;
      });

      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: ProjectSettings = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, ProjectSettingsFileName);
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sinon.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });

      const res = await handlers.openConfigStateFile([{ type: "state" }]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.EnvStateNotFoundError);
        chai.assert.equal(
          res.error.message,
          util.format(localizeUtils.localize("teamstoolkit.handlers.localStateFileNotFound"), env)
        );
      }
    });

    it("openConfigStateFile() - env - FileNotFound", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: ProjectSettings = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, ProjectSettingsFileName);
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sinon.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });
      sinon.stub(pathUtils, "getEnvFolderPath").resolves(ok(path.resolve("../../env")));

      const res = await handlers.openConfigStateFile([{ type: "env" }]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.EnvFileNotFoundError);
      }
    });

    it("openConfigStateFile() - InvalidArgs", async () => {
      const env = "local";
      const tmpDir = fs.mkdtempSync(path.resolve("./tmp"));

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(tmpDir));
      const projectSettings: ProjectSettings = {
        appName: "myapp",
        version: "1.0.0",
        projectId: "123",
      };
      const configFolder = path.resolve(tmpDir, `.${ConfigFolderName}`, "configs");
      await fs.mkdir(configFolder, { recursive: true });
      const settingsFile = path.resolve(configFolder, ProjectSettingsFileName);
      await fs.writeJSON(settingsFile, JSON.stringify(projectSettings, null, 4));

      sinon.stub(globalVariables, "context").value({ extensionPath: path.resolve("../../") });
      sinon.stub(extension, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: env })),
      });

      const res = await handlers.openConfigStateFile([]);
      await fs.remove(tmpDir);

      if (res) {
        chai.assert.isTrue(res.isErr());
        chai.assert.equal(res.error.name, ExtensionErrors.InvalidArgs);
      }
    });

    it("create sample with projectid", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createProject = sinon.spy(handlers.core, "createProject");
      sinon.stub(vscode.commands, "executeCommand");
      const inputs = { projectId: uuid.v4(), platform: Platform.VSCode };
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.runCommand(Stage.create, inputs);

      sinon.assert.calledOnce(createProject);
      chai.assert.isTrue(createProject.args[0][0].projectId != undefined);
      chai.assert.isTrue(sendTelemetryEvent.args[0][1]!["new-project-id"] != undefined);
    });

    it("create from scratch without projectid", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createProject = sinon.spy(handlers.core, "createProject");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(true);

      await handlers.runCommand(Stage.create);

      sinon.restore();
      sinon.assert.calledOnce(createProject);
      chai.assert.isTrue(createProject.args[0][0].projectId != undefined);
      chai.assert.isTrue(sendTelemetryEvent.args[0][1]!["new-project-id"] != undefined);
    });

    it("provisionResources", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const provisionResources = sinon.spy(handlers.core, "provisionResources");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.runCommand(Stage.provision);

      sinon.restore();
      sinon.assert.calledOnce(provisionResources);
    });

    it("deployArtifacts", async () => {
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const deployArtifacts = sinon.spy(handlers.core, "deployArtifacts");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.runCommand(Stage.deploy);

      sinon.restore();
      sinon.assert.calledOnce(deployArtifacts);
    });

    it("deployAadManifest", async () => {
      const sandbox = sinon.createSandbox();
      sandbox.stub(handlers, "core").value(new MockCore());
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const deployAadManifest = sandbox.spy(handlers.core, "deployAadManifest");
      sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
      const input: Inputs = handlers.getSystemInputs();
      await handlers.runCommand(Stage.deployAad, input);

      sandbox.assert.calledOnce(deployAadManifest);
      sandbox.restore();
    });

    it("deployAadManifest happy path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      const sandbox = sinon.createSandbox();
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sandbox.stub(handlers.core, "deployAadManifest").resolves(ok("test_success"));
      sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
      const input: Inputs = handlers.getSystemInputs();
      const res = await handlers.runCommand(Stage.deployAad, input);
      chai.assert.isTrue(res.isOk());
      if (res.isOk()) {
        chai.assert.strictEqual(res.value, "test_success");
      }
      sandbox.restore();
    });

    it("localDebug", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

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
      chai.expect(ignoreEnvInfo).to.equal(false);
      chai.expect(localDebugCalled).equals(1);
    });

    it("publishApplication", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const publishApplication = sinon.spy(handlers.core, "publishApplication");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.runCommand(Stage.publish);

      sinon.restore();
      sinon.assert.calledOnce(publishApplication);
    });

    it("createEnv", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const createEnv = sinon.spy(handlers.core, "createEnv");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      await handlers.runCommand(Stage.createEnv);

      sinon.restore();
      sinon.assert.calledOnce(createEnv);
    });
  });

  describe("detectVsCodeEnv()", function () {
    this.afterEach(() => {
      sinon.restore();
    });

    it("locally run", () => {
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

    it("Remotely run", () => {
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

  it("openWelcomeHandler", async () => {
    const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.openWelcomeHandler();

    sandbox.assert.calledOnceWithExactly(
      executeCommands,
      "workbench.action.openWalkthrough",
      "TeamsDevApp.ms-teams-vscode-extension#teamsToolkitGetStarted"
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

    sandbox.assert.calledOnceWithExactly(createOrShow, PanelType.SampleGallery, false);
  });

  it("openReadMeHandler v3", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
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

  it("openReadMeHandler spfx - v2", async () => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(globalVariables, "isTeamsFxProject").value(true);
    sandbox.stub(globalVariables, "isSPFxProject").value(true);
    sandbox.stub(commonTools, "isV3Enabled").returns(false);
    const fake_config_v2 = {
      isFromSample: false,
    };
    sandbox.stub(MockCore.prototype, "getProjectConfig").resolves(ok(fake_config_v2));
    const executeCommands = sandbox.stub(vscode.commands, "executeCommand");
    sandbox
      .stub(vscode.workspace, "workspaceFolders")
      .value([{ uri: { fsPath: "readmeTestFolder" } }]);
    sandbox.stub(fs, "pathExists").resolves(false);
    const openTextDocumentStub = sandbox
      .stub(vscode.workspace, "openTextDocument")
      .resolves({} as any as vscode.TextDocument);

    await handlers.openReadMeHandler([extTelemetryEvents.TelemetryTriggerFrom.Auto]);

    chai.assert.isTrue(openTextDocumentStub.calledOnce);
    chai.assert.isTrue(executeCommands.calledOnce);
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
    const signOut = sandbox.stub(AzureAccountManager.getInstance(), "signout");
    const sendTelemetryEvent = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");

    await handlers.signOutAzure(false);

    sandbox.assert.calledOnce(signOut);
  });

  describe("decryptSecret", function () {
    this.afterEach(() => {
      sinon.restore();
    });
    it("successfully update secret", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(globalVariables, "context").value({ extensionPath: "" });
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const decrypt = sinon.spy(handlers.core, "decrypt");
      const encrypt = sinon.spy(handlers.core, "encrypt");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(true);
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

    it("failed to update due to corrupted secret", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(globalVariables, "context").value({ extensionPath: "" });
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const decrypt = sinon.stub(handlers.core, "decrypt");
      decrypt.returns(Promise.resolve(err(new UserError("", "fake error", ""))));
      const encrypt = sinon.spy(handlers.core, "encrypt");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(true);
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

  describe("permissions", async function () {
    this.afterEach(() => {
      sinon.restore();
    });
    it("grant permission", async () => {
      sinon.restore();
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(M365TokenInstance, "getJsonObject").resolves(
        ok({
          tid: "fake-tenant-id",
        })
      );

      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.parse("file://fakeProjectPath"));
      sinon.stub(globalVariables, "isSPFxProject").value(false);
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
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);

      const result = await handlers.grantPermission("env");
      chai.expect(result.isOk()).equals(true);
    });

    it("grant permission with empty tenant id", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(M365TokenInstance, "getJsonObject").resolves(
        ok({
          tid: "fake-tenant-id",
        })
      );
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

    it("list collaborators", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(M365TokenInstance, "getJsonObject").resolves(
        ok({
          tid: "fake-tenant-id",
        })
      );
      sinon.stub(commonUtils, "getM365TenantFromEnv").callsFake(async (env: string) => {
        return "fake-tenant-id";
      });

      await handlers.listCollaborator("env");
    });

    it("list collaborators with empty tenant id", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      const sendTelemetryEvent = sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const sendTelemetryErrorEvent = sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(commonUtils, "getProvisionSucceedFromEnv").resolves(true);
      sinon.stub(M365TokenInstance, "getJsonObject").resolves(
        ok({
          tid: "fake-tenant-id",
        })
      );
      sinon.stub(commonUtils, "getM365TenantFromEnv").callsFake(async (env: string) => {
        return "";
      });

      const showWarningMessage = sinon
        .stub(vscode.window, "showWarningMessage")
        .callsFake((message: string): any => {
          chai
            .expect(message)
            .equal(StringResources["teamstoolkit.commandsTreeViewProvider.emptyM365Tenant"]);
        });
      await handlers.listCollaborator("env");

      chai.expect(showWarningMessage.callCount).to.be.equal(1);
    });
  });

  describe("permission v3", function () {
    const sandbox = sinon.createSandbox();

    this.beforeEach(() => {
      sandbox.stub(commonTools, "isV3Enabled").returns(true);
    });

    this.afterEach(() => {
      sandbox.restore();
    });

    it("happy path: grant permission", async () => {
      sandbox.stub(handlers, "core").value(new MockCore());
      sandbox.stub(extension, "VS_CODE_UI").value({
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
      sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);

      const result = await handlers.manageCollaboratorHandler("env");
      chai.expect(result.isOk()).equals(true);
    });

    it("happy path: list collaborator", async () => {
      sandbox.stub(handlers, "core").value(new MockCore());
      sandbox.stub(extension, "VS_CODE_UI").value({
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
      sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
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
      sandbox.stub(handlers, "core").value(new MockCore());
      sandbox.stub(extension, "VS_CODE_UI").value({
        selectOption: () => Promise.resolve(ok({ type: "success", result: "listCollaborator" })),
      });
      sandbox.stub(MockCore.prototype, "listCollaborator").throws(new Error("Error"));
      sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
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

    it("User Cancel", async () => {
      sandbox.stub(handlers, "core").value(new MockCore());
      sandbox.stub(extension, "VS_CODE_UI").value({
        selectOption: () =>
          Promise.resolve(err(new UserError("source", "errorName", "errorMessage"))),
      });

      const result = await handlers.manageCollaboratorHandler();
      chai.expect(result.isErr()).equals(true);
    });
  });

  describe("manifest", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("edit manifest template: local", async () => {
      sinon.restore();
      sinon.stub(commonTools, "isV3Enabled").returns(false);
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
          "undefined/templates/appPackage/manifest.template.json" as any
        )
      );
    });

    it("edit manifest template: remote", async () => {
      sinon.restore();
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      const openTextDocument = sinon
        .stub(vscode.workspace, "openTextDocument")
        .returns(new Promise<vscode.TextDocument>((resolve) => {}));
      sinon
        .stub(vscode.workspace, "workspaceFolders")
        .returns([{ uri: { fsPath: "c:\\manifestTestFolder" } }]);

      const args = [{ fsPath: "c:\\testPath\\manifest.dev.json" }, "CodeLens"];
      await handlers.editManifestTemplate(args);
      chai.assert.isTrue(
        openTextDocument.calledOnceWith(
          "undefined/templates/appPackage/manifest.template.json" as any
        )
      );
    });
  });

  describe("checkUpgrade V3", function () {
    const sandbox = sinon.createSandbox();
    const mockCore = new MockCore();

    beforeEach(() => {
      sandbox.stub(handlers, "getSystemInputs").returns({} as Inputs);
      sandbox.stub(vscodeHelper, "isDotnetCheckerEnabled").returns(false);
      sandbox.stub(commonTools, "isV3Enabled").returns(true);
      sandbox.stub(handlers, "core").value(mockCore);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("calls phantomMigrationV3 with isNonmodalMessage when auto triggered", async () => {
      const phantomMigrationV3Stub = sandbox
        .stub(mockCore, "phantomMigrationV3")
        .resolves(ok(undefined));
      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.Auto]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          "function-dotnet-checker-enabled": false,
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          isNonmodalMessage: true,
        } as Inputs)
      );
    });

    it("calls phantomMigrationV3 with confirmOnly when button is clicked", async () => {
      const phantomMigrationV3Stub = sandbox
        .stub(mockCore, "phantomMigrationV3")
        .resolves(ok(undefined));
      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.SideBar]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          "function-dotnet-checker-enabled": false,
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          confirmOnly: true,
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
        .stub(mockCore, "phantomMigrationV3")
        .resolves(err(error));
      sandbox.stub(localizeUtils, "localize").returns("");
      const showErrorMessageStub = sinon.stub(vscode.window, "showErrorMessage");
      sandbox.stub(vscode.commands, "executeCommand");

      await handlers.checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.SideBar]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          "function-dotnet-checker-enabled": false,
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          confirmOnly: true,
        } as Inputs)
      );
      chai.assert.isTrue(showErrorMessageStub.calledOnce);
    });
  });

  it("downloadSample", async () => {
    const inputs: Inputs = {
      scratch: "no",
      platform: Platform.VSCode,
    };
    sandbox.stub(handlers, "core").value(new MockCore());
    const createProject = sandbox.spy(handlers.core, "createProject");

    await handlers.downloadSample(inputs);

    inputs.stage = Stage.create;
    chai.assert.isTrue(createProject.calledOnceWith(inputs));
  });

  it("deployAadAppManifest", async () => {
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    sandbox.stub(commonTools, "isV3Enabled").returns(false);
    sandbox.stub(handlers, "core").value(new MockCore());
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    const deployArtifacts = sandbox.spy(handlers.core, "deployArtifacts");
    await handlers.updateAadAppManifest([{ fsPath: "path/aad.dev.template" }, "CodeLens"]);
    sandbox.assert.calledOnce(deployArtifacts);
    chai.assert.equal(deployArtifacts.getCall(0).args[0]["include-aad-manifest"], "yes");
  });

  it("deployAadAppmanifest for v3", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(true);
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    sandbox.stub(handlers, "core").value(new MockCore());
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    const deployAadManifest = sandbox.spy(handlers.core, "deployAadManifest");
    await handlers.updateAadAppManifest([{ fsPath: "path/aad.dev.template" }]);
    sandbox.assert.calledOnce(deployAadManifest);
    deployAadManifest.restore();
  });

  it("deployAadAppManifest on codelens only for v2", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(false);
    sandbox.stub(vscodeHelper, "checkerEnabled").returns(false);
    sandbox.stub(handlers, "core").value(new MockCore());
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    const deployArtifacts = sandbox.spy(handlers.core, "deployArtifacts");
    await handlers.updateAadAppManifest([{ fsPath: "path/aad.dev.template" }, "CodeLens"]);
    sandbox.assert.calledOnce(deployArtifacts);
    chai.assert.equal(deployArtifacts.getCall(0).args[0]["include-aad-manifest"], "yes");
    deployArtifacts.restore();
  });

  it("showError", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(false);
    sandbox.stub(localizeUtils, "localize").returns("");
    const showErrorMessageStub = sandbox
      .stub(vscode.window, "showErrorMessage")
      .callsFake((title: string, button: any) => {
        return Promise.resolve(button);
      });
    const sendTelemetryEventStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(vscode.commands, "executeCommand");
    const error = new UserError("test source", "test name", "test message", "test displayMessage");
    error.helpLink = "test helpLink";

    await handlers.showError(error);

    chai.assert.isTrue(
      sendTelemetryEventStub.calledWith(extTelemetryEvents.TelemetryEvent.ClickGetHelp, {
        "error-code": "test source.test name",
        "error-message": "test displayMessage",
        "help-link": "test helpLink",
      })
    );
  });

  describe("promptSPFxUpgrade", async () => {
    it("Prompt user to upgrade toolkit when project SPFx version higher than toolkit", async () => {
      sinon.stub(globalVariables, "isSPFxProject").value(true);
      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(""));
      sinon
        .stub(commonTools, "getAppSPFxVersion")
        .resolves(`1.${parseInt(SUPPORTED_SPFX_VERSION.split(".")[1]) + 1}.0`);
      const stubShowMessage = sinon.stub().resolves(ok({}));
      sinon.stub(extension, "VS_CODE_UI").value({
        showMessage: stubShowMessage,
      });

      await handlers.promptSPFxUpgrade();

      chai.assert(stubShowMessage.calledOnce);
      chai.assert.equal(stubShowMessage.args[0].length, 4);
      sinon.restore();
    });

    it("Prompt user to upgrade project when project SPFx version lower than toolkit", async () => {
      sinon.stub(globalVariables, "isSPFxProject").value(true);
      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(""));
      sinon
        .stub(commonTools, "getAppSPFxVersion")
        .resolves(`1.${parseInt(SUPPORTED_SPFX_VERSION.split(".")[1]) - 1}.0`);

      const stubShowMessage = sinon.stub().resolves(ok({}));
      sinon.stub(extension, "VS_CODE_UI").value({
        showMessage: stubShowMessage,
      });

      await handlers.promptSPFxUpgrade();

      chai.assert(stubShowMessage.calledOnce);
      chai.assert.equal(stubShowMessage.args[0].length, 4);
      sinon.restore();
    });

    it("Dont show notification when project SPFx version is the same with toolkit", async () => {
      sinon.stub(globalVariables, "isSPFxProject").value(true);
      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file(""));
      sinon.stub(commonTools, "getAppSPFxVersion").resolves(SUPPORTED_SPFX_VERSION);
      const stubShowMessage = sinon.stub();
      sinon.stub(extension, "VS_CODE_UI").value({
        showMessage: stubShowMessage,
      });

      await handlers.promptSPFxUpgrade();

      chai.assert.equal(stubShowMessage.callCount, 0);
      sinon.restore();
    });
  });

  describe("getDotnetPathHandler", async () => {
    afterEach(() => {
      sinon.restore();
    });
    it("dotnet is installed", async () => {
      sinon.stub(DepsManager.prototype, "getStatus").resolves([
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
      sinon.stub(DepsManager.prototype, "getStatus").resolves([
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
      sinon.stub(DepsManager.prototype, "getStatus").rejects(new Error("failed to get status"));
      const dotnetPath = await handlers.getDotnetPathHandler();
      chai.assert.equal(dotnetPath, `${path.delimiter}`);
    });
  });

  describe("scaffoldFromDeveloperPortalHandler", async () => {
    beforeEach(() => {
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
    });
    afterEach(() => {
      sinon.restore();
    });
    it("missing args", async () => {
      const progressHandler = new ProgressHandler("title", 1);
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);

      const res = await handlers.scaffoldFromDeveloperPortalHandler();

      chai.assert.equal(res.isOk(), true);
      chai.assert.equal(createProgressBar.notCalled, true);
    });

    it("incorrect number of args", async () => {
      const progressHandler = new ProgressHandler("title", 1);
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);

      const res = await handlers.scaffoldFromDeveloperPortalHandler([]);

      chai.assert.equal(res.isOk(), true);
      chai.assert.equal(createProgressBar.notCalled, true);
    });

    it("general error when signing in M365", async () => {
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sinon.stub(progressHandler, "start").resolves();
      const endProgress = sinon.stub(progressHandler, "end").resolves();
      sinon.stub(M365TokenInstance, "signInWhenInitiatedFromTdp").throws("error1");
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      const showErrorMessage = sinon.stub(vscode.window, "showErrorMessage");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);
      chai.assert.isTrue(res.isErr());
      chai.assert.isTrue(createProgressBar.calledOnce);
      chai.assert.isTrue(startProgress.calledOnce);
      chai.assert.isTrue(endProgress.calledOnceWithExactly(false));
      chai.assert.isTrue(showErrorMessage.calledOnce);
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "error1");
      }
    });

    it("error when signing M365", async () => {
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sinon.stub(progressHandler, "start").resolves();
      const endProgress = sinon.stub(progressHandler, "end").resolves();
      sinon
        .stub(M365TokenInstance, "signInWhenInitiatedFromTdp")
        .resolves(err(new UserError("source", "name", "message", "displayMessage")));
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      const showErrorMessage = sinon.stub(vscode.window, "showErrorMessage");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);

      chai.assert.equal(res.isErr(), true);
      chai.assert.equal(createProgressBar.calledOnce, true);
      chai.assert.equal(startProgress.calledOnce, true);
      chai.assert.equal(endProgress.calledOnceWithExactly(false), true);
      chai.assert.equal(showErrorMessage.calledOnce, true);
    });

    it("error when signing in M365 but missing display message", async () => {
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sinon.stub(progressHandler, "start").resolves();
      const endProgress = sinon.stub(progressHandler, "end").resolves();
      sinon
        .stub(M365TokenInstance, "signInWhenInitiatedFromTdp")
        .resolves(err(new UserError("source", "name", "", "")));
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      const showErrorMessage = sinon.stub(vscode.window, "showErrorMessage");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);

      chai.assert.equal(res.isErr(), true);
      chai.assert.equal(createProgressBar.calledOnce, true);
      chai.assert.equal(startProgress.calledOnce, true);
      chai.assert.equal(endProgress.calledOnceWithExactly(false), true);
      chai.assert.equal(showErrorMessage.calledOnce, true);
    });

    it("failed to get teams app", async () => {
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sinon.stub(progressHandler, "start").resolves();
      const endProgress = sinon.stub(progressHandler, "end").resolves();
      sinon.stub(M365TokenInstance, "signInWhenInitiatedFromTdp").resolves(ok("token"));
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(commonUtils, "isExistingTabApp").returns(Promise.resolve(false));
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(globalState, "globalStateUpdate");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);
      const getApp = sinon.stub(AppStudioClient, "getApp").throws("error");

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId"]);

      chai.assert.isTrue(res.isErr());
      chai.assert.isTrue(getApp.calledOnce);
      chai.assert.isTrue(createProgressBar.calledOnce);
      chai.assert.isTrue(startProgress.calledOnce);
      chai.assert.isTrue(endProgress.calledOnceWithExactly(true));
    });

    it("happy path", async () => {
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const progressHandler = new ProgressHandler("title", 1);
      const startProgress = sinon.stub(progressHandler, "start").resolves();
      const endProgress = sinon.stub(progressHandler, "end").resolves();
      sinon.stub(M365TokenInstance, "signInWhenInitiatedFromTdp").resolves(ok("token"));
      const createProgressBar = sinon
        .stub(extension.VS_CODE_UI, "createProgressBar")
        .returns(progressHandler);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(commonUtils, "isExistingTabApp").returns(Promise.resolve(false));
      const createProject = sinon.spy(handlers.core, "createProject");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(globalState, "globalStateUpdate");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
      };
      sinon.stub(AppStudioClient, "getApp").resolves(appDefinition);

      const res = await handlers.scaffoldFromDeveloperPortalHandler(["appId", "testuser"]);

      chai.assert.equal(createProject.args[0][0].teamsAppFromTdp.teamsAppId, "mock-id");
      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(createProgressBar.calledOnce);
      chai.assert.isTrue(startProgress.calledOnce);
      chai.assert.isTrue(endProgress.calledOnceWithExactly(true));
    });
  });

  describe("publishInDeveloperPortalHandler", async () => {
    beforeEach(() => {
      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("publish in developer portal - success", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon
        .stub(extension.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test.zip" }));
      const publish = sinon.spy(handlers.core, "publishInDeveloperPortal");
      sinon
        .stub(extension.VS_CODE_UI, "selectOption")
        .resolves(ok({ type: "success", result: "test.zip" }));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);

      const res = await handlers.publishInDeveloperPortalHandler();
      if (res.isErr()) {
        console.log(res.error);
      }
      chai.assert.isTrue(publish.calledOnce);
      chai.assert.isTrue(res.isOk());
    });

    it("publish in developer portal - cancelled", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon
        .stub(extension.VS_CODE_UI, "selectFile")
        .resolves(ok({ type: "success", result: "test2.zip" }));
      const publish = sinon.spy(handlers.core, "publishInDeveloperPortal");
      sinon.stub(extension.VS_CODE_UI, "selectOption").resolves(err(UserCancelError));
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);

      const res = await handlers.publishInDeveloperPortalHandler();
      if (res.isErr()) {
        console.log(res.error);
      }
      chai.assert.isTrue(publish.notCalled);
      chai.assert.isTrue(res.isOk());
    });

    it("select file error", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon.stub(extension.VS_CODE_UI, "selectFile").resolves(err(UserCancelError));
      const publish = sinon.spy(handlers.core, "publishInDeveloperPortal");
      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      sinon.stub(vscode.commands, "executeCommand");
      sinon.stub(vscodeHelper, "checkerEnabled").returns(false);
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readdir").resolves(["test.zip", "test.json"] as any);

      const res = await handlers.publishInDeveloperPortalHandler();
      chai.assert.isTrue(res.isOk());
      chai.assert.isFalse(publish.calledOnce);
    });
  });

  describe("openAppManagement", async () => {
    afterEach(() => {
      sinon.restore();
    });

    it("open link with loginHint", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon.stub(handlers, "core").value(new MockCore());
      sinon.stub(M365TokenInstance, "getStatus").resolves(
        ok({
          status: signedIn,
          token: undefined,
          accountInfo: { upn: "test" },
        })
      );
      const openUrl = sinon.stub(extension.VS_CODE_UI, "openUrl").resolves(ok(true));

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      const res = await handlers.openAppManagement();

      chai.assert.isTrue(openUrl.calledOnce);
      chai.assert.isTrue(res.isOk());
      chai.assert.equal(openUrl.args[0][0], `${DeveloperPortalHomeLink}?login_hint=test`);
    });

    it("open link without loginHint", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      sinon.stub(M365TokenInstance, "getStatus").resolves(
        ok({
          status: signedOut,
          token: undefined,
          accountInfo: { upn: "test" },
        })
      );
      const openUrl = sinon.stub(extension.VS_CODE_UI, "openUrl").resolves(ok(true));

      sinon.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(ExtTelemetry, "sendTelemetryErrorEvent");

      const res = await handlers.openAppManagement();

      chai.assert.isTrue(openUrl.calledOnce);
      chai.assert.isTrue(res.isOk());
      chai.assert.equal(openUrl.args[0][0], DeveloperPortalHomeLink);
    });
  });

  describe("installAppInTeams", () => {
    beforeEach(() => {
      sinon.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("v3: happ path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(debugCommonUtils, "getV3TeamsAppId").returns(Promise.resolve("appId"));
      sinon
        .stub(teamsAppInstallation, "showInstallAppInTeamsMessage")
        .returns(Promise.resolve(true));
      const result = await handlers.installAppInTeams();
      chai.assert.equal(result, undefined);
    });

    it("v3: user cancel", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(debugCommonUtils, "getV3TeamsAppId").returns(Promise.resolve("appId"));
      sinon
        .stub(teamsAppInstallation, "showInstallAppInTeamsMessage")
        .returns(Promise.resolve(false));
      sinon.stub(taskHandler, "terminateAllRunningTeamsfxTasks").callsFake(() => {});
      sinon.stub(debugCommonUtils, "endLocalDebugSession").callsFake(() => {});
      const result = await handlers.installAppInTeams();
      chai.assert.equal(result, "1");
    });

    it("v2: happy path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(debugCommonUtils, "getDebugConfig").returns(
        Promise.resolve({
          appId: "appId",
          env: "local",
        })
      );
      sinon
        .stub(teamsAppInstallation, "showInstallAppInTeamsMessage")
        .returns(Promise.resolve(true));
      const result = await handlers.installAppInTeams();
      chai.assert.equal(result, undefined);
    });

    it("v2: no appId", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(debugCommonUtils, "getDebugConfig").returns(Promise.resolve(undefined));
      sinon.stub(handlers, "showError").callsFake(async () => {});
      sinon.stub(taskHandler, "terminateAllRunningTeamsfxTasks").callsFake(() => {});
      sinon.stub(debugCommonUtils, "endLocalDebugSession").callsFake(() => {});
      const result = await handlers.installAppInTeams();
      chai.assert.equal(result, "1");
    });
  });

  describe("callBackFunctions", () => {
    it("checkSideloadingCallback()", async () => {
      sinon.stub(localizeUtils, "localize").returns("");
      let showMessageCalledCount = 0;
      sinon.stub(extension, "VS_CODE_UI").value({
        showMessage: async () => {
          showMessageCalledCount += 1;
          return ok(undefined);
        },
      });

      await handlers.checkSideloadingCallback();

      chai.expect(showMessageCalledCount).to.be.equal(1);
      sinon.restore();
    });
  });

  describe("validateAzureDependenciesHandler", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("v3: happy path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(debugCommonUtils, "triggerV3Migration").returns(Promise.resolve(undefined));
      const result = await handlers.validateAzureDependenciesHandler();
      chai.assert.equal(result, undefined);
    });

    it("skip debugging", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(debugCommonUtils, "checkAndSkipDebugging").returns(true);
      const result = await handlers.validateAzureDependenciesHandler();
      chai.assert.equal(result, "1");
    });

    it("should not continue", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(debugCommonUtils, "checkAndSkipDebugging").returns(false);
      sinon.stub(ExtTelemetry, "sendTelemetryEvent").callsFake(() => {});
      sinon.stub(debugCommonUtils, "getProjectComponents").returns(Promise.resolve(""));
      sinon.stub(VSCodeDepsChecker.prototype, "resolve").returns(Promise.resolve(false));
      sinon.stub(debugCommonUtils, "endLocalDebugSession").callsFake(() => {});
      const result = await handlers.validateAzureDependenciesHandler();
      chai.assert.equal(result, "1");
    });

    it("should continue", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(debugCommonUtils, "checkAndSkipDebugging").returns(false);
      sinon.stub(ExtTelemetry, "sendTelemetryEvent").callsFake(() => {});
      sinon.stub(debugCommonUtils, "getProjectComponents").returns(Promise.resolve(""));
      sinon.stub(VSCodeDepsChecker.prototype, "resolve").returns(Promise.resolve(true));
      sinon.stub(debugCommonUtils, "getPortsInUse").returns(Promise.resolve([]));
      const result = await handlers.validateAzureDependenciesHandler();
      chai.assert.equal(result, undefined);
    });
  });

  describe("validateLocalPrerequisitesHandler", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("v3: happy path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(debugCommonUtils, "triggerV3Migration").returns(Promise.resolve(undefined));
      const result = await handlers.validateLocalPrerequisitesHandler();
      chai.assert.equal(result, undefined);
    });

    it("skip debugging", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(false);
      sinon.stub(debugCommonUtils, "checkAndSkipDebugging").returns(true);
      const result = await handlers.validateLocalPrerequisitesHandler();
      chai.assert.equal(result, "1");
      sinon.restore();
    });
  });

  describe("backendExtensionsInstallHandler", () => {
    it("v3: happy path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(debugCommonUtils, "triggerV3Migration").returns(Promise.resolve(undefined));
      const result = await handlers.backendExtensionsInstallHandler();
      chai.assert.equal(result, undefined);
      sinon.restore();
    });
  });

  describe("preDebugCheckHandler", () => {
    it("v3: happy path", async () => {
      sinon.stub(commonTools, "isV3Enabled").returns(true);
      sinon.stub(debugCommonUtils, "triggerV3Migration").returns(Promise.resolve(undefined));
      const result = await handlers.preDebugCheckHandler();
      chai.assert.equal(result, undefined);
      sinon.restore();
    });
  });

  describe("openDocumentHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("opens upgrade guide when clicked from sidebar", async () => {
      sandbox.stub(commonTools, "isV3Enabled").returns(true);
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sinon.stub(extension, "VS_CODE_UI").value(new VsCodeUI(<vscode.ExtensionContext>{}));
      const openUrl = sandbox.stub(extension.VS_CODE_UI, "openUrl").resolves(ok(true));

      await handlers.openDocumentHandler([
        extTelemetryEvents.TelemetryTriggerFrom.SideBar,
        "learnmore",
      ]);

      chai.assert.isTrue(sendTelemetryStub.calledOnceWith("documentation"));
      chai.assert.isTrue(openUrl.calledOnceWith("https://aka.ms/teams-toolkit-5.0-upgrade"));
    });
  });

  it("refreshSPFxTreeOnFileChanged", async () => {
    sandbox.stub(commonTools, "isV3Enabled").returns(false);
    const initGlobalVariables = sandbox.stub(globalVariables, "initializeGlobalVariables");
    const updateTreeViewsOnSPFxChanged = sandbox
      .stub(TreeViewManagerInstance, "updateTreeViewsOnSPFxChanged")
      .resolves();

    await handlers.refreshSPFxTreeOnFileChanged();

    chai.expect(initGlobalVariables.calledOnce).to.be.true;
    chai.expect(updateTreeViewsOnSPFxChanged.calledOnce).to.be.true;
  });
});
