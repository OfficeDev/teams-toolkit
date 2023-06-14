import * as chai from "chai";
import * as os from "os";
import * as sinon from "sinon";
import { Uri } from "vscode";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import { envUtil, metadataUtil, pathUtils } from "@microsoft/teamsfx-core";
import * as extensionPackage from "../../package.json";
import * as globalVariables from "../../src/globalVariables";
import * as handlers from "../../src/handlers";
import { TelemetryProperty, TelemetryTriggerFrom } from "../../src/telemetry/extTelemetryEvents";
import * as commonUtils from "../../src/utils/commonUtils";
import { MockCore } from "../mocks/mockCore";
import * as coreUtils from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

describe("CommonUtils", () => {
  describe("getPackageVersion", () => {
    it("alpha version", () => {
      const version = "1.1.1-alpha.4";

      chai.expect(commonUtils.getPackageVersion(version)).equals("alpha");
    });

    it("beta version", () => {
      const version = "1.1.1-beta.2";

      chai.expect(commonUtils.getPackageVersion(version)).equals("beta");
    });

    it("rc version", () => {
      const version = "1.0.0-rc.3";

      chai.expect(commonUtils.getPackageVersion(version)).equals("rc");
    });

    it("formal version", () => {
      const version = "4.6.0";

      chai.expect(commonUtils.getPackageVersion(version)).equals("formal");
    });
  });

  describe("isFeatureFlag", () => {
    it("return true when enabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("true");

      chai.expect(commonUtils.isFeatureFlag()).equals(true);

      sinon.restore();
    });

    it("return false when disabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("false");

      chai.expect(commonUtils.isFeatureFlag()).equals(false);

      sinon.restore();
    });
  });

  describe("sleep", () => {
    it("sleep should be accurate", async () => {
      const start = Date.now();

      commonUtils.sleep(1000).then(() => {
        const millis = Date.now() - start;

        chai.expect(millis).gte(1000);

        chai.expect(millis).lte(1100);
      });
    });
  });

  describe("os assertion", () => {
    it("should return exactly result according to os.type", async () => {
      sinon.stub(os, "type").returns("Windows_NT");

      chai.expect(commonUtils.isWindows()).equals(true);

      sinon.restore();

      sinon.stub(os, "type").returns("Linux");

      chai.expect(commonUtils.isLinux()).equals(true);

      sinon.restore();

      sinon.stub(os, "type").returns("Darwin");

      chai.expect(commonUtils.isMacOS()).equals(true);

      sinon.restore();
    });
  });

  describe("getProjectId", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(handlers, "core").value(core);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("happy path", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getProjectId").resolves(ok("mock-project-id"));
      const result = await commonUtils.getProjectId();
      chai.expect(result).equals("mock-project-id");
    });
    it("workspaceUri is undefined", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(undefined);
      const result = await commonUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
    it("return error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getProjectId").resolves(err(new UserError({})));
      const result = await commonUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
    it("throw error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(core, "getProjectId").rejects(new UserError({}));
      const result = await commonUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
  });

  describe("getAppName", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(handlers, "core").value(core);
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
  });

  describe("getTeamsAppTelemetryInfoByEnv", async () => {
    const sandbox = sinon.createSandbox();
    const core = new MockCore();

    beforeEach(() => {
      sandbox.stub(handlers, "core").value(core);
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
});
