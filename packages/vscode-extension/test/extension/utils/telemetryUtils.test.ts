import * as chai from "chai";
import * as sinon from "sinon";
import { Uri } from "vscode";
import { err, ok, UserError } from "@microsoft/teamsfx-api";
import * as globalVariables from "../../../src/globalVariables";
import * as telemetryUtils from "../../../src/utils/telemetryUtils";
import { MockCore } from "../../mocks/mockCore";
import { TelemetryProperty, TelemetryTriggerFrom } from "../../../src/telemetry/extTelemetryEvents";
import * as coreUtils from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";

describe("TelemetryUtils", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("getPackageVersion", () => {
    it("alpha version", () => {
      const version = "1.1.1-alpha.4";

      chai.expect(telemetryUtils.getPackageVersion(version)).equals("alpha");
    });

    it("beta version", () => {
      const version = "1.1.1-beta.2";

      chai.expect(telemetryUtils.getPackageVersion(version)).equals("beta");
    });

    it("rc version", () => {
      const version = "1.0.0-rc.3";

      chai.expect(telemetryUtils.getPackageVersion(version)).equals("rc");
    });

    it("formal version", () => {
      const version = "4.6.0";

      chai.expect(telemetryUtils.getPackageVersion(version)).equals("formal");
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

  describe("getTriggerFromProperty", () => {
    it("Should return cmp with no args", () => {
      const props = telemetryUtils.getTriggerFromProperty();

      chai.expect(props).to.deep.equal({
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CommandPalette,
      });
    });

    it("Should return cmp with empty args", () => {
      const props = telemetryUtils.getTriggerFromProperty([]);

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
        const props = telemetryUtils.getTriggerFromProperty([triggerFrom]);

        chai.expect(props).to.deep.equal({
          [TelemetryProperty.TriggerFrom]: triggerFrom,
        });
      });
    }
  });

  describe("isTriggerFromWalkThrough", () => {
    it("Should return false with no args", () => {
      const isFromWalkthrough = telemetryUtils.isTriggerFromWalkThrough();

      chai.assert.equal(isFromWalkthrough, false);
    });

    it("Should return false with empty args", () => {
      const isFromWalkthrough = telemetryUtils.isTriggerFromWalkThrough([]);

      chai.assert.equal(isFromWalkthrough, false);
    });

    it("Should return true with walkthrough args", () => {
      const isFromWalkthrough = telemetryUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.WalkThrough,
      ]);

      chai.assert.equal(isFromWalkthrough, true);
    });

    it("Should return true with notification args", () => {
      const isFromWalkthrough = telemetryUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.Notification,
      ]);

      chai.assert.equal(isFromWalkthrough, true);
    });

    it("Should return false with other args", () => {
      const isFromWalkthrough = telemetryUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.Other,
      ]);

      chai.assert.equal(isFromWalkthrough, false);
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
      const result = await telemetryUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).deep.equals({
        appId: "mock-app-id",
        tenantId: "mock-tenant-id",
      });
    });
    it("isValidProject is false", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("."));
      sandbox.stub(coreUtils, "isValidProject").returns(false);
      const result = await telemetryUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).equals(undefined);
    });
    it("return error", async () => {
      sandbox.stub(coreUtils, "isValidProject").returns(true);
      sandbox.stub(core, "getProjectInfo").resolves(err(new UserError({})));
      const result = await telemetryUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).equals(undefined);
    });
    it("throw error", async () => {
      sandbox.stub(coreUtils, "isValidProject").returns(true);
      sandbox.stub(core, "getTeamsAppName").rejects(new UserError({}));
      const result = await telemetryUtils.getTeamsAppTelemetryInfoByEnv("dev");
      chai.expect(result).equals(undefined);
    });
  });
});
