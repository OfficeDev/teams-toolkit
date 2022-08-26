// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { SubscriptionInfo, TokenProvider } from "@microsoft/teamsfx-api";
import { azureWebSiteDeploy } from "../../../src/common/azure-hosting/utils";
import { MockedAzureAccountProvider } from "../../plugins/solution/util";
import { AzureOperations } from "../../../src/common/azure-hosting/azureOps";
import * as sinon from "sinon";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import chaiAsPromised from "chai-as-promised";
import { PreconditionError } from "../../../src/common/azure-hosting/hostingError";
import { TokenCredential, AccessToken, GetTokenOptions } from "@azure/core-http";
chai.use(chaiAsPromised);

class MyTokenCredential implements TokenCredential {
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions | undefined
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 12345,
    };
  }
}

describe("hosting util test", () => {
  describe("azureWebSiteDeploy", () => {
    const subscriptionId = "testSubs";
    const rgName = "testRg";
    const siteName = "testSite";
    const resourceId = `/subscriptions/${subscriptionId}/resourceGroups/${rgName}/providers/Microsoft.Web/sites/${siteName}`;

    class FakeAzureAccountProvider extends MockedAzureAccountProvider {
      async getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential> {
        return new MyTokenCredential();
      }
      async listSubscriptions(): Promise<SubscriptionInfo[]> {
        return [{ subscriptionId: subscriptionId, subscriptionName: "sub1", tenantId: "222" }];
      }
    }
    const provider = {
      azureAccountProvider: new FakeAzureAccountProvider(),
    } as TokenProvider;
    it("Happy Path for azureWebSiteDeploy", async () => {
      sinon.stub(AzureOperations, "listPublishingCredentials").resolves({
        publishingUserName: "user",
        publishingPassword: "pass",
      });
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("url");
      sinon.stub(AzureOperations, "checkDeployStatus");
      const res = await azureWebSiteDeploy(resourceId, provider, Buffer.alloc(1, ""));
      chai.assert.isTrue(!!res);
    });

    it("Cannot get Credential azureWebSiteDeploy", async () => {
      sinon.stub(provider.azureAccountProvider, "getIdentityCredentialAsync").resolves(undefined);
      sinon.stub(AzureOperations, "zipDeployPackage").resolves("url");
      sinon.stub(AzureOperations, "checkDeployStatus");
      await chai
        .expect(azureWebSiteDeploy(resourceId, provider, Buffer.alloc(1, "")))
        .to.be.rejectedWith(PreconditionError);
    });
  });

  afterEach(() => {
    sinon.restore();
  });
});
