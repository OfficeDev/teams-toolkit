import { err, Platform } from "@microsoft/teamsfx-api";
import { UserCancelError } from "@microsoft/teamsfx-core";
import { assert } from "chai";
import * as sinon from "sinon";
import { provisionHandler } from "../../src/handlers/lifecycleHandlers";
import * as shared from "../../src/handlers/sharedOpts";
import { processResult } from "../../src/handlers/sharedOpts";
import * as telemetryUtils from "../../src/utils/telemetryUtils";

describe("Lifecycle handlers", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

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
  });
});
