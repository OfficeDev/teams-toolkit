import { err, ok, Platform } from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import * as projectSettingsHelper from "@microsoft/teamsfx-core/build/common/projectSettingsHelper";
import { assert } from "chai";
import * as sinon from "sinon";
import * as copilotHandler from "../../src/handlers/copilotChatHandlers";
import {
  createNewProjectHandler,
  deployHandler,
  provisionHandler,
  publishHandler,
} from "../../src/handlers/lifecycleHandlers";
import * as shared from "../../src/handlers/sharedOpts";
import { processResult } from "../../src/handlers/sharedOpts";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import { TelemetryEvent } from "../../src/telemetry/extTelemetryEvents";
import envTreeProviderInstance from "../../src/treeview/environmentTreeViewProvider";
import * as telemetryUtils from "../../src/utils/telemetryUtils";
import * as workspaceUtils from "../../src/utils/workspaceUtils";

describe("Lifecycle handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
  });

  afterEach(() => {
    sandbox.restore();
  });
  describe("provision handlers", () => {
    it("error", async () => {
      sandbox.stub(shared, "runCommand").resolves(err(new UserCancelError()));
      const res = await provisionHandler();
      assert.isTrue(res.isErr());
    });
  });

  describe("processResult", () => {
    it("UserCancelError", async () => {
      sandbox.stub(telemetryUtils, "getTeamsAppTelemetryInfoByEnv").resolves({
        appId: "mockId",
        tenantId: "mockTenantId",
      });
      await processResult("", err(new UserCancelError()), {
        platform: Platform.VSCode,
        env: "dev",
      });
    });
    it("CreateNewEnvironment", async () => {
      await processResult(TelemetryEvent.CreateNewEnvironment, ok(null), {
        platform: Platform.VSCode,
        sourceEnvName: "dev",
        targetEnvName: "dev1",
      });
    });
  });

  describe("createNewProjectHandler", function () {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("invokeTeamsAgent", async () => {
      sandbox.stub(shared, "runCommand").resolves(
        ok({
          projectPath: "abc",
          shouldInvokeTeamsAgent: true,
          projectId: "mockId",
        })
      );
      sandbox.stub(copilotHandler, "invokeTeamsAgent").resolves();
      const res = await createNewProjectHandler();
      assert.isTrue(res.isOk());
    });
    it("triggered in office agent", async () => {
      sandbox.stub(projectSettingsHelper, "isValidOfficeAddInProject").returns(true);
      sandbox.stub(shared, "runCommand").resolves(
        ok({
          projectPath: "abc",
          shouldInvokeTeamsAgent: false,
          projectId: "mockId",
        })
      );
      sandbox.stub(copilotHandler, "invokeTeamsAgent").resolves();
      const res = await createNewProjectHandler("", { agent: "office" });
      assert.isTrue(res.isOk());
    });
    it("office add-in", async () => {
      sandbox.stub(projectSettingsHelper, "isValidOfficeAddInProject").returns(true);
      const openOfficeDevFolder = sandbox.stub(workspaceUtils, "openOfficeDevFolder").resolves();
      sandbox.stub(shared, "runCommand").resolves(
        ok({
          projectPath: "abc",
          shouldInvokeTeamsAgent: false,
          projectId: "mockId",
        })
      );
      const res = await createNewProjectHandler();
      assert.isTrue(res.isOk());
      assert.isTrue(openOfficeDevFolder.calledOnce);
    });
    it("none office add-in", async () => {
      sandbox.stub(projectSettingsHelper, "isValidOfficeAddInProject").returns(false);
      const openFolder = sandbox.stub(workspaceUtils, "openFolder").resolves();
      sandbox.stub(shared, "runCommand").resolves(
        ok({
          projectPath: "abc",
          shouldInvokeTeamsAgent: false,
          projectId: "mockId",
        })
      );
      const res = await createNewProjectHandler({ teamsAppFromTdp: true }, {});
      assert.isTrue(res.isOk());
      assert.isTrue(openFolder.calledOnce);
    });
  });
  describe("provisionHandler", function () {
    it("happy", async () => {
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      sandbox.stub(envTreeProviderInstance, "reloadEnvironments");
      const res = await provisionHandler();
      assert.isTrue(res.isOk());
    });
  });
  describe("deployHandler", function () {
    it("happy", async () => {
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      const res = await deployHandler();
      assert.isTrue(res.isOk());
    });
  });
  describe("publishHandler", function () {
    it("happy()", async () => {
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      const res = await publishHandler();
      assert.isTrue(res.isOk());
    });
  });
});
