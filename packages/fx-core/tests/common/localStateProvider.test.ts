import "mocha";
import sinon from "sinon";
import { LocalStateProvider } from "../../src/common/localStateProvider";
import { MockCryptoProvider } from "../core/utils";
import { environmentManager } from "../../src/core/environment";
import { ok, v3 } from "@microsoft/teamsfx-api";

describe("LocalState load", () => {
  const sandbox = sinon.createSandbox();

  afterEach(async () => {
    sandbox.restore();
  });

  it("should load correct", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { provisionSucceeded: true },
        "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
      },
      config: {},
    };
    sandbox.stub(environmentManager, "loadEnvInfo").resolves(ok(envInfo));

    const localStateProvider = new LocalStateProvider("./");
    localStateProvider.loadV2(new MockCryptoProvider());
  });
});
