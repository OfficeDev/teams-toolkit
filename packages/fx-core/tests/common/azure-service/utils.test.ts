// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { Inputs, SubscriptionInfo, TokenProvider } from "@microsoft/teamsfx-api";
import { azureWebSiteDeploy } from "../../../src/common/azure-service/utils";
import { MockedAzureAccountProvider } from "../../plugins/solution/util";
import { AzureOperations } from "../../../src/common/azure-service/azureOps";
import * as sinon from "sinon";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import chaiAsPromised from "chai-as-promised";
import { PreconditionError } from "../../../src/common/azure-service/errors";
chai.use(chaiAsPromised);

describe("hosting util test", () => {
  describe("azureWebSiteDeploy", () => {
    const inputs = {
      subscriptionId: 1,
    } as unknown as Inputs;
    class FakeAzureAccountProvider extends MockedAzureAccountProvider {
      async listSubscriptions(): Promise<SubscriptionInfo[]> {
        return [{ subscriptionId: "111", subscriptionName: "sub1", tenantId: "222" }];
      }
    }
    const provider = {
      azureAccountProvider: new FakeAzureAccountProvider(),
    } as TokenProvider;
    it("Happy Path for azureWebSiteDeploy", async () => {
      sinon.stub(AzureOperations, "listPublishingCredentials").resolves({
        _response: {
          status: 200,
        },
        publishingUserName: "user",
        publishingPassword: "pass",
      });
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("url");
      sinon.stub(AzureOperations, "checkDeployStatus");
      const res = await azureWebSiteDeploy(inputs, provider, Buffer.alloc(1, ""), "");
      chai.assert.isTrue(!!res);
    });

    it("Cannot get Credential azureWebSiteDeploy", async () => {
      sinon.stub(provider.azureAccountProvider, "getAccountCredentialAsync").resolves(undefined);
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("url");
      sinon.stub(AzureOperations, "checkDeployStatus");
      await chai
        .expect(azureWebSiteDeploy(inputs, provider, Buffer.alloc(1, ""), ""))
        .to.be.rejectedWith(PreconditionError);
    });
  });

  afterEach(() => {
    sinon.restore();
  });
});
