/**
 * @author HuihuiWu-Microsoft <73154171+HuihuiWu-Microsoft@users.noreply.github.com>
 */
import { Inputs, SystemError, UserError, err, ok } from "@microsoft/teamsfx-api";
import { DepsManager, DepsType } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import path from "path";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as getStartedChecker from "../../src/debug/depsChecker/getStartedChecker";
import * as errorCommon from "../../src/error/common";
import * as globalVariables from "../../src/globalVariables";
import {
  checkUpgrade,
  getDotnetPathHandler,
  getPathDelimiterHandler,
  validateGetStartedPrerequisitesHandler,
  installAdaptiveCardExt,
  triggerV3MigrationHandler,
} from "../../src/handlers/prerequisiteHandlers";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import * as extTelemetryEvents from "../../src/telemetry/extTelemetryEvents";
import * as localizeUtils from "../../src/utils/localizeUtils";
import * as migrationUtils from "../../src/utils/migrationUtils";
import * as systemEnvUtils from "../../src/utils/systemEnvUtils";
import { MockCore } from "../mocks/mockCore";

describe("prerequisiteHandlers", () => {
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
      await checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.Auto]);
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
      await checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.SideBar]);
      chai.assert.isTrue(
        phantomMigrationV3Stub.calledOnceWith({
          locale: "en-us",
          platform: "vsc",
          projectPath: undefined,
          vscodeEnv: "local",
          skipUserConfirm: true,
        } as Inputs)
      );
      await checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.CommandPalette]);
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

      await checkUpgrade([extTelemetryEvents.TelemetryTriggerFrom.SideBar]);
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

      const dotnetPath = await getDotnetPathHandler();
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

      const dotnetPath = await getDotnetPathHandler();
      chai.assert.equal(dotnetPath, `${path.delimiter}`);
    });

    it("failed to get dotnet path", async () => {
      sandbox.stub(DepsManager.prototype, "getStatus").rejects(new Error("failed to get status"));
      const dotnetPath = await getDotnetPathHandler();
      chai.assert.equal(dotnetPath, `${path.delimiter}`);
    });
  });

  describe("triggerV3MigrationHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").resolves();
      const result = await triggerV3MigrationHandler();
      chai.assert.equal(result, undefined);
    });

    it("migration error", async () => {
      sandbox.stub(migrationUtils, "triggerV3Migration").throws(err({ foo: "bar" } as any));
      sandbox.stub(errorCommon, "showError").resolves();
      const result = await triggerV3MigrationHandler();
      chai.assert.equal(result, "1");
    });
  });

  describe("getPathDelimiterHandler", () => {
    it("happy path", async () => {
      const actualPath = await getPathDelimiterHandler();
      chai.assert.equal(actualPath, path.delimiter);
    });
  });

  describe("validateGetStartedPrerequisitesHandler", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("error", async () => {
      const sendTelemetryStub = sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox
        .stub(getStartedChecker, "checkPrerequisitesForGetStarted")
        .resolves(err(new SystemError("test", "test", "test")));

      const result = await validateGetStartedPrerequisitesHandler();

      chai.assert.isTrue(sendTelemetryStub.called);
      chai.assert.isTrue(result.isErr());
    });
  });

  describe("installAdaptiveCardExt", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("Happy path()", async () => {
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(vscode.extensions, "getExtension").returns(undefined);
      const executeCommandStub = sandbox.stub(vscode.commands, "executeCommand");

      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("test"));
      const showMessageStub = sandbox
        .stub(vscode.window, "showInformationMessage")
        .resolves("Install" as unknown as vscode.MessageItem);

      await installAdaptiveCardExt();

      chai.assert.isTrue(executeCommandStub.calledOnce);
    });
  });
});
