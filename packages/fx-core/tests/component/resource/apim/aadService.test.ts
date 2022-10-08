// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { assert, createSandbox, SinonStub } from "sinon";
import { AadService } from "../../../../src/component/resource/apim/services/aadService";
import { aadMatcher, mockAxios, DefaultTestInput } from "./mock";
import { IAadInfo } from "../../../../src/component/resource/apim/interfaces/IAadResource";
chai.use(chaiAsPromised);

describe("AadService", () => {
  describe("#createAad()", () => {
    let aadService: AadService | undefined;
    let requestStub: any;
    const sandbox = createSandbox();

    beforeEach(async () => {
      const res = mockAxios(sandbox);
      const axiosInstance = res.axiosInstance;
      requestStub = res.requestStub;
      aadService = new AadService(axiosInstance, undefined, undefined, 2);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Create a new AAD", async () => {
      const aadInfo = await aadService!.createAad(DefaultTestInput.aadDisplayName.new);
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.createAad);
      chai.assert.isNotEmpty(aadInfo.id);
      chai.assert.isNotEmpty(aadInfo.appId);
    });

    it("Failed to create a new AAD", async () => {
      await chai
        .expect(aadService!.createAad(DefaultTestInput.aadDisplayName.error))
        .to.be.rejectedWith();
      sandbox.assert.calledThrice(requestStub);
      sandbox.assert.calledWith(
        requestStub,
        aadMatcher.createAad.and(
          aadMatcher.body({
            displayName: DefaultTestInput.aadDisplayName.error,
          })
        )
      );
    });
  });

  describe("#addSecret()", () => {
    let aadService: AadService | undefined;
    let requestStub: any;
    const sandbox = createSandbox();

    beforeEach(async () => {
      const res = mockAxios(sandbox);
      const axiosInstance = res.axiosInstance;
      requestStub = res.requestStub;
      aadService = new AadService(axiosInstance, undefined, undefined, 2);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("Add a secret", async () => {
      const secretInfo = await aadService!.addSecret(
        DefaultTestInput.aadObjectId.created,
        DefaultTestInput.aadSecretDisplayName.new
      );
      sandbox.assert.calledOnceWithMatch(
        requestStub,
        aadMatcher.addSecret.and(
          aadMatcher.body({
            passwordCredential: {
              displayName: DefaultTestInput.aadSecretDisplayName.new,
            },
          })
        )
      );
      chai.assert.isNotEmpty(secretInfo?.secretText);
    });
  });

  describe("#updateAad()", () => {
    let aadService: AadService | undefined;
    let requestStub: any;
    const sandbox = createSandbox();

    beforeEach(async () => {
      const res = mockAxios(sandbox);
      const axiosInstance = res.axiosInstance;
      requestStub = res.requestStub;
      aadService = new AadService(axiosInstance, undefined, undefined, 2);
    });

    afterEach(() => {
      sandbox.restore();
    });

    const testData: { message: string; updateData: IAadInfo }[] = [
      { message: "empty redirectUris", updateData: { web: { redirectUris: [] } } },
      {
        message: "one redirectUris",
        updateData: { web: { redirectUris: ["https://www.test-redirect-url.com/login"] } },
      },
      {
        message: "multiple redirectUris",
        updateData: {
          web: {
            redirectUris: [
              "https://www.test-redirect-url-1.com/login",
              "https://www.test-redirect-url-2.com/login",
            ],
          },
        },
      },
    ];

    testData.forEach((data) => {
      it(data.message, async () => {
        await aadService!.updateAad(DefaultTestInput.aadObjectId.created, data.updateData);
        sandbox.assert.calledOnceWithMatch(
          requestStub,
          aadMatcher.updateAad.and(aadMatcher.body(data.updateData))
        );
      });
    });
  });

  describe("#createServicePrincipalIfNotExists()", () => {
    let aadService: AadService | undefined;
    let requestStub: any;
    const sandbox = createSandbox();

    beforeEach(async () => {
      const res = mockAxios(sandbox);
      const axiosInstance = res.axiosInstance;
      requestStub = res.requestStub;
      aadService = new AadService(axiosInstance, undefined, undefined, 2);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("create service principal", async () => {
      await aadService!.createServicePrincipalIfNotExists(DefaultTestInput.aadClientId.new);
      sandbox.assert.calledTwice(requestStub);
      sandbox.assert.calledWithMatch(requestStub, aadMatcher.getServicePrincipals);
      sandbox.assert.calledWithMatch(
        requestStub,
        aadMatcher.createServicePrincipal.and(
          aadMatcher.body({ appId: DefaultTestInput.aadClientId.new })
        )
      );
    });

    it("skip to create service principal if it is existing", async () => {
      await aadService!.createServicePrincipalIfNotExists(DefaultTestInput.aadClientId.created);
      assert.calledOnceWithMatch(requestStub, aadMatcher.getServicePrincipals);
    });
  });
});
