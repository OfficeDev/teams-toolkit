import * as chai from "chai";
import * as fs from "fs-extra";
import * as os from "os";
import * as sinon from "sinon";
import * as cp from "child_process";
import * as vscode from "vscode";
import { Uri } from "vscode";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import { envUtil, metadataUtil, pathUtils } from "@microsoft/teamsfx-core";
import * as globalVariables from "../../../src/globalVariables";
import { TelemetryProperty, TelemetryTriggerFrom } from "../../../src/telemetry/extTelemetryEvents";
import * as commonUtils from "../../../src/utils/commonUtils";
import * as telemetryUtils from "../../../src/utils/telemetryUtils";
import { MockCore } from "../../mocks/mockCore";
import * as coreUtils from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import * as mockfs from "mock-fs";

describe("CommonUtils", () => {
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore();
  });

  describe("openFolderInExplorer", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", () => {
      const folderPath = "fakePath";
      sandbox.stub(cp, "exec");
      commonUtils.openFolderInExplorer(folderPath);
    });
  });

  describe("os assertion", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("should return exactly result according to os.type", async () => {
      sandbox.stub(os, "type").returns("Windows_NT");
      chai.expect(commonUtils.isWindows()).equals(true);
      sandbox.restore();

      sandbox.stub(os, "type").returns("Linux");
      chai.expect(commonUtils.isLinux()).equals(true);
      sandbox.restore();

      sandbox.stub(os, "type").returns("Darwin");
      chai.expect(commonUtils.isMacOS()).equals(true);
      sandbox.restore();
    });
  });

  describe("getProjectId", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(globalVariables, "core").value(core);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getProjectId").resolves(ok("mock-project-id"));
      const result = await telemetryUtils.getProjectId();
      chai.expect(result).equals("mock-project-id");
    });
    it("workspaceUri is undefined", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(undefined);
      const result = await telemetryUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
    it("return error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getProjectId").resolves(err(new UserError({})));
      const result = await telemetryUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
    it("throw error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getProjectId").rejects(new UserError({}));
      const result = await telemetryUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
  });

  describe("getAppName", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(globalVariables, "core").value(core);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(core, "getTeamsAppName").resolves(ok("mock-app-name"));
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      const result = await commonUtils.getAppName();
      chai.expect(result).equals("mock-app-name");
    });
    it("workspaceUri is undefined", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(undefined);
      const result = await commonUtils.getAppName();
      chai.expect(result).equals(undefined);
    });
    it("return error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getTeamsAppName").resolves(err(new UserError({})));
      const result = await commonUtils.getAppName();
      chai.expect(result).equals(undefined);
    });
    it("throw error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getTeamsAppName").rejects(new UserError({}));
      const result = await commonUtils.getAppName();
      chai.expect(result).equals(undefined);
    });
    it("should return undefined if getTeamsAppName returns empty string", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getTeamsAppName").resolves(ok(""));
      const result = await commonUtils.getAppName();
      chai.expect(result).equals(undefined);
    });
  });

  describe("getTeamsAppTelemetryInfoByEnv", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(globalVariables, "core").value(core);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      const info = {
        projectId: "mock-project-id",
        teamsAppId: "mock-app-id",
        teamsAppName: "mock-app-name",
        m365TenantId: "mock-tenant-id",
      };
      sandbox.stub(core, "getProjectInfo").resolves(ok(info));
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(coreUtils, "isValidProject").returns(true);
      const result = await commonUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).deep.equals({
        appId: "mock-app-id",
        tenantId: "mock-tenant-id",
      });
    });
    it("isValidProject is false", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(coreUtils, "isValidProject").returns(false);
      const result = await commonUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).equals(undefined);
    });
    it("return error", async () => {
      sandbox.stub(coreUtils, "isValidProject").returns(true);
      sandbox.stub(core, "getProjectInfo").resolves(err(new UserError({})));
      const result = await commonUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).equals(undefined);
    });
    it("throw error", async () => {
      sandbox.stub(coreUtils, "isValidProject").returns(true);
      sandbox.stub(core, "getTeamsAppName").rejects(new UserError({}));
      const result = await commonUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).equals(undefined);
    });
  });

  describe("isTriggerFromWalkThrough", () => {
    it("Should return false with no args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough();

      chai.assert.equal(isFromWalkthrough, false);
    });

    it("Should return false with empty args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([]);

      chai.assert.equal(isFromWalkthrough, false);
    });

    it("Should return true with walkthrough args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.WalkThrough,
      ]);

      chai.assert.equal(isFromWalkthrough, true);
    });

    it("Should return true with notification args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.Notification,
      ]);

      chai.assert.equal(isFromWalkthrough, true);
    });

    it("Should return false with other args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([TelemetryTriggerFrom.Other]);

      chai.assert.equal(isFromWalkthrough, false);
    });
  });

  describe("getTriggerFromProperty", () => {
    it("Should return cmp with no args", () => {
      const props = commonUtils.getTriggerFromProperty();

      chai.expect(props).to.deep.equal({
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CommandPalette,
      });
    });

    it("Should return cmp with empty args", () => {
      const props = commonUtils.getTriggerFromProperty([]);

      chai.expect(props).to.deep.equal({
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CommandPalette,
      });
    });

    for (const triggerFrom of [
      TelemetryTriggerFrom.Auto,
      TelemetryTriggerFrom.CodeLens,
      TelemetryTriggerFrom.EditorTitle,
      TelemetryTriggerFrom.Webview,
      TelemetryTriggerFrom.Notification,
      TelemetryTriggerFrom.Other,
      TelemetryTriggerFrom.QuickPick,
      TelemetryTriggerFrom.SideBar,
      TelemetryTriggerFrom.TreeView,
      TelemetryTriggerFrom.Unknow,
      TelemetryTriggerFrom.ViewTitleNavigation,
      TelemetryTriggerFrom.WalkThrough,
    ]) {
      it(`Should return ${triggerFrom.toString()}`, () => {
        const props = commonUtils.getTriggerFromProperty([triggerFrom]);

        chai.expect(props).to.deep.equal({
          [TelemetryProperty.TriggerFrom]: triggerFrom,
        });
      });
    }
  });

  describe("getProvisionSucceedFromEnv", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("returns false if teamsAppId is empty", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          TEAMS_APP_ID: "",
        })
      );

      const result = await commonUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(false);
    });

    it("returns true if teamsAppId is not empty", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          TEAMS_APP_ID: "xxx",
        })
      );
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(pathUtils, "getYmlFilePath");
      sandbox.stub(metadataUtil, "parse").resolves(ok({} as any));

      const result = await commonUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(true);
    });

    it("returns false if teamsAppId has error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(ok({}));

      const result = await commonUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(false);
    });
  });
  describe("hasAdaptiveCardInWorkspace()", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      mockfs.restore();
      sandbox.restore();
    });

    it("no workspace", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(undefined);

      const result = await commonUtils.hasAdaptiveCardInWorkspace();

      chai.assert.isFalse(result);
    });

    it("happy path", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("/test"));
      mockfs({
        "/test/card.json": JSON.stringify({
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          actions: [
            {
              type: "Action.OpenUrl",
              title: "More Info",
              url: "https://example.com",
            },
          ],
        }),
      });

      const result = await commonUtils.hasAdaptiveCardInWorkspace();

      chai.assert.isTrue(result);
    });

    it("hasAdaptiveCardInWorkspace() no adaptive card file", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("/test"));
      mockfs({
        "/test/card.json": JSON.stringify({ hello: "world" }),
      });

      const result = await commonUtils.hasAdaptiveCardInWorkspace();

      chai.assert.isFalse(result);
    });

    it("hasAdaptiveCardInWorkspace() very large adaptive card file", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("/test"));
      mockfs({
        "/test/card.json": JSON.stringify({
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.5",
          actions: [
            {
              type: "Action.OpenUrl",
              title: "a".repeat(1024 * 1024 + 10),
              url: "https://example.com",
            },
          ],
        }),
      });

      const result = await commonUtils.hasAdaptiveCardInWorkspace();

      chai.assert.isFalse(result);
    });
  });

  describe("getLocalDebugMessageTemplate()", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("Test Tool enabled in Windows platform", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
      sandbox.stub(fs, "pathExists").resolves(true);

      const result = await commonUtils.getLocalDebugMessageTemplate(true);
      chai.assert.isTrue(result.includes("Test Tool"));
    });

    it("Test Tool disabled in Windows platform", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
      sandbox.stub(fs, "pathExists").resolves(false);

      const result = await commonUtils.getLocalDebugMessageTemplate(true);
      chai.assert.isFalse(result.includes("Test Tool"));
    });

    it("Test Tool enabled in non-Windows platform", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
      sandbox.stub(fs, "pathExists").resolves(true);

      const result = await commonUtils.getLocalDebugMessageTemplate(false);
      chai.assert.isTrue(result.includes("Test Tool"));
    });

    it("Test Tool disabled in non-Windows platform", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: vscode.Uri.file("test") }]);
      sandbox.stub(fs, "pathExists").resolves(false);

      const result = await commonUtils.getLocalDebugMessageTemplate(false);
      chai.assert.isFalse(result.includes("Test Tool"));
    });

    it("No workspace folder", async () => {
      sandbox.stub(vscode.workspace, "workspaceFolders").value([]);
      sandbox.stub(fs, "pathExists").resolves(false);

      const result = await commonUtils.getLocalDebugMessageTemplate(false);
      chai.assert.isFalse(result.includes("Test Tool"));
    });
  });
});
