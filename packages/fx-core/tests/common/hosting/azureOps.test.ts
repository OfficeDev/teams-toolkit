// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import { AzureOperations } from "../../../src/common/azure-hosting/azureOps";
import * as appService from "@azure/arm-appservice";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import chaiAsPromised from "chai-as-promised";
import {
  DeployStatusError,
  DeployTimeoutError,
  ListPublishingCredentialsError,
  RestartWebAppError,
  ZipDeployError,
} from "../../../src/common/azure-hosting/hostingError";
import { ErrorNameConstant } from "../../../src/common/azure-hosting/hostingConstant";
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

describe("azure operation test", () => {
  describe("listPublishingCredentials test", () => {
    const fake = new MyTokenCredential();
    const client = new appService.WebSiteManagementClient(fake, "z");

    it("listPublishingCredentials success", async () => {
      sinon.stub(client.webApps, "beginListPublishingCredentialsAndWait").resolves({
        publishingUserName: "user",
        publishingPassword: "pass",
      });
      const res = await AzureOperations.listPublishingCredentials(client, "test-rg", "siteName");
      chai.assert.equal(res.publishingUserName, "user");
      chai.assert.equal(res.publishingPassword, "pass");
    });

    it("listPublishingCredentials request error", async () => {
      const err = new Error("fake error");
      sinon.stub(client.webApps, "beginListPublishingCredentialsAndWait").throws(err);
      await chai
        .expect(AzureOperations.listPublishingCredentials(client, "test-rg", "siteName"))
        .to.eventually.be.rejectedWith()
        .and.be.an.instanceof(ListPublishingCredentialsError)
        .and.have.property("name")
        .equals(ErrorNameConstant.LIST_PUBLISHING_CREDENTIALS_ERROR);
    });

    it("listPublishingCredentials request body empty", async () => {
      sinon.stub(client.webApps, "beginListPublishingCredentialsAndWait").rejects(new Error(""));
      await chai
        .expect(AzureOperations.listPublishingCredentials(client, "test-rg", "siteName"))
        .to.be.rejectedWith(ListPublishingCredentialsError);
    });
  });

  describe("zipDeployPackage", () => {
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };

    it("zipDeployPackage success", async () => {
      sinon.stub(AzureOperations.axiosInstance, "post").resolves({
        headers: {
          location: "abc",
        },
        status: 202,
      });
      chai.assert.equal(
        "abc",
        await AzureOperations.zipDeployPackage("", Buffer.alloc(1, ""), config)
      );
    });

    it("zipDeployPackage request error", async () => {
      sinon.stub(AzureOperations.axiosInstance, "post").throws(new Error("fake error"));
      await chai
        .expect(AzureOperations.zipDeployPackage("", Buffer.alloc(1, ""), config))
        .to.be.rejectedWith(ZipDeployError);
    });

    it("zipDeployPackage request code error", async () => {
      sinon.stub(AzureOperations.axiosInstance, "post").resolves({
        headers: {
          location: "abc",
        },
        status: 404,
      });
      await chai
        .expect(AzureOperations.zipDeployPackage("", Buffer.alloc(1, ""), config))
        .to.be.rejectedWith(ZipDeployError);
    });
  });

  describe("checkDeployStatus", () => {
    const config = {
      headers: {
        "Content-Type": "text",
        "Cache-Control": "no-cache",
        Authorization: "no",
      },
      maxContentLength: 200,
      maxBodyLength: 200,
      timeout: 200,
    };

    it("checkDeployStatus success", async () => {
      sinon.stub(AzureOperations.axiosInstance, "get").resolves({
        status: 200,
      });
      await AzureOperations.checkDeployStatus("", config);
    });

    it("checkDeployStatus response error", async () => {
      sinon.stub(AzureOperations.axiosInstance, "get").resolves({
        status: 400,
      });
      await chai
        .expect(AzureOperations.checkDeployStatus("", config))
        .to.be.rejectedWith(DeployStatusError);
    });

    it("checkDeployStatus throw error", async () => {
      sinon.stub(AzureOperations.axiosInstance, "get").throws(new Error("fake error"));
      await chai
        .expect(AzureOperations.checkDeployStatus("", config))
        .to.be.rejectedWith(DeployStatusError);
    });

    it("checkDeployStatus empty response", async () => {
      sinon.stub(AzureOperations.axiosInstance, "get").resolves(undefined);
      await chai
        .expect(AzureOperations.checkDeployStatus("", config))
        .to.be.rejectedWith(DeployTimeoutError);
    });
  });

  describe("restartWebApp", () => {
    const fake = new MyTokenCredential();
    const client = new appService.WebSiteManagementClient(fake, "z");

    it("restartWebApp ok", async () => {
      sinon.stub(client.webApps, "restart").resolves();
      await AzureOperations.restartWebApp(client, "test-rg", "");
    });

    it("restartWebApp throw error", async () => {
      sinon.stub(client.webApps, "restart").throws(new Error("fake error"));
      await chai
        .expect(AzureOperations.restartWebApp(client, "test-rg", ""))
        .to.be.rejectedWith(RestartWebAppError);
    });

    it("restartWebApp response with http error", async () => {
      sinon.stub(client.webApps, "restart").rejects(new Error(""));
      await chai
        .expect(AzureOperations.restartWebApp(client, "test-rg", ""))
        .to.be.rejectedWith(RestartWebAppError);
    });
  });

  afterEach(() => {
    sinon.restore();
  });
});
