import { ok, Void } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import * as sinon from "sinon";
import { createNewEnvironment, refreshEnvironment } from "../../src/handlers/envHandlers";
import * as shared from "../../src/handlers/sharedOpts";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import envTreeProviderInstance from "../../src/treeview/environmentTreeViewProvider";

describe("Env handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
    sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
  });

  afterEach(() => {
    sandbox.restore();
  });
  describe("createNewEnvironment", () => {
    it("happy", async () => {
      sandbox.stub(envTreeProviderInstance, "reloadEnvironments").resolves(ok(Void));
      sandbox.stub(shared, "runCommand").resolves(ok(undefined));
      const res = await createNewEnvironment();
      assert.isTrue(res.isOk());
    });
  });
  describe("refreshEnvironment", () => {
    it("happy", async () => {
      sandbox.stub(envTreeProviderInstance, "reloadEnvironments").resolves(ok(Void));
      const res = await refreshEnvironment();
      assert.isTrue(res.isOk());
    });
  });
});
