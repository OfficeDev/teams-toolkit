import {
  LogLevel,
  LogProvider,
  ok,
  Ok,
  ProjectSettings,
  ResourceContextV3,
} from "@microsoft/teamsfx-api";
import chai from "chai";
import p from "proxyquire";
import * as sinon from "sinon";
import { provisionUtils } from "../../src/component/provisionUtils";
import { createContextV3 } from "../../src/component/utils";
import { SolutionError } from "../../src/plugins/solution";
import { MockAzureAccountProvider } from "../core/utils";
import { MyTokenCredential } from "../plugins/resource/bot/unit/utils";
import { TestHelper } from "../plugins/resource/frontend/helper";

const expect = chai.expect;

function MockContext(): any {
  return {
    envInfo: {
      envName: "test",
      config: {},
      state: { solution: {} },
    },
  };
}

describe("checkProvisionSubscription", () => {
  const mocker = sinon.createSandbox();

  afterEach(() => {
    mocker.restore();
  });

  it("provision with CLI parameters succeeds", async () => {
    const context = createContextV3();
    const azureAccountProvider = new MockAzureAccountProvider();
    const envInfo = {
      envName: "test",
      config: {},
      state: { solution: {} },
    };
    mocker.stub(context.logProvider, "log").resolves(true);
    mocker
      .stub(azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "cli-sub",
        tenantId: "mockTenantId",
      },
    ]);

    const res = await provisionUtils.checkProvisionSubscription(
      context,
      envInfo,
      azureAccountProvider,
      "cli-sub"
    );

    expect(res.isOk()).equal(true);
    if (res.isErr()) {
      console.log(res.error);
    }
    expect((envInfo.state.solution as any).subscriptionId).equal("cli-sub");
  });

  it("provision with CLI parameters error", async () => {
    const context = createContextV3();
    const azureAccountProvider = new MockAzureAccountProvider();
    const envInfo = {
      envName: "test",
      config: {},
      state: { solution: {} },
    };
    mocker.stub(context.logProvider, "log").resolves(true);
    mocker
      .stub(azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "sub",
        tenantId: "mockTenantId",
      },
    ]);

    const res = await provisionUtils.checkProvisionSubscription(
      context,
      envInfo,
      azureAccountProvider,
      "cli-sub"
    );

    expect(res.isErr()).equal(true);
    if (res.isErr()) {
      console.log(res.error);
      expect(res.error.name).equals(SolutionError.SubscriptionNotFound);
    }
  });

  it("provision with config error", async () => {
    const context = createContextV3();
    const azureAccountProvider = new MockAzureAccountProvider();
    const envInfo = {
      envName: "test",
      config: {
        azure: {
          subscriptionId: "mockSub",
        },
      },
      state: { solution: {} },
    };
    mocker.stub(context.logProvider, "log").resolves(true);
    mocker
      .stub(azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "sub",
        tenantId: "mockTenantId",
      },
    ]);

    const res = await provisionUtils.checkProvisionSubscription(
      context,
      envInfo,
      azureAccountProvider,
      undefined
    );

    expect(res.isErr()).equal(true);
    if (res.isErr()) {
      console.log(res.error);
      expect(res.error.name).equals(SolutionError.SubscriptionNotFound);
    }
  });

  it("provision with config succeeds", async () => {
    const context = createContextV3();
    const azureAccountProvider = new MockAzureAccountProvider();
    const envInfo = {
      envName: "test",
      config: {
        azure: {
          subscriptionId: "mockSub",
        },
      },
      state: { solution: {} },
    };
    mocker.stub(context.logProvider, "log").resolves(true);
    mocker
      .stub(azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    mocker.stub(azureAccountProvider, "listSubscriptions").resolves([
      {
        subscriptionName: "mockSubName",
        subscriptionId: "mockSub",
        tenantId: "mockTenantId",
      },
    ]);

    const res = await provisionUtils.checkProvisionSubscription(
      context,
      envInfo,
      azureAccountProvider,
      undefined
    );

    expect(res.isOk()).equal(true);
    if (res.isErr()) {
      console.log(res.error);
    }
    expect((envInfo.state.solution as any).subscriptionId).equal("mockSub");
  });
});
