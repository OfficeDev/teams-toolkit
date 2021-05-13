// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import axios, { AxiosInstance } from "axios";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { v4 } from "uuid";
import { AadHelper, MockGraphTokenProvider, it_if, before_if, after_if, EnvConfig } from "./testUtil";
import { AadService } from "../../../../src/plugins/resource/apim/services/aadService";
import { AadDefaultValues } from "../../../../src/plugins/resource/apim/constants";
import { IAadInfo } from "../../../../src/plugins/resource/apim/interfaces/IAadResource";
chai.use(chaiAsPromised);

const UT_SUFFIX = v4().substring(0, 6);
const UT_AAD_NAME = `fx-apim-local-unit-test-aad-${UT_SUFFIX}`;

describe("AadService", () => {
    let aadService: AadService;
    let aadHelper: AadHelper;
    let axiosInstance: AxiosInstance;

    before_if(EnvConfig.enableTest, async () => {
        const result = await buildService();
        aadService = result.aadService;
        aadHelper = result.aadTestHelper;
        axiosInstance = result.axiosInstance;
    });

    after_if(EnvConfig.enableTest, async () => {
        await aadHelper.deleteAadByName(UT_AAD_NAME);
    });

    describe("#createAad()", () => {
        it_if(EnvConfig.enableTest, "Create a new AAD", async () => {
            // Act
            const aadInfo = await aadService.createAad(UT_AAD_NAME);

            // Assert
            chai.assert.isNotEmpty(aadInfo.id);
            const queryResult = await aadService.getAad(aadInfo.id ?? "");
            chai.assert.isNotEmpty(queryResult);
        });
    });

    describe("#addSecret()", () => {
        let aadObjectId: string;

        before_if(EnvConfig.enableTest, async () => {
            const aadInfo = await aadService?.createAad(UT_AAD_NAME);
            aadObjectId = aadInfo.id ?? "";
        });

        it_if(EnvConfig.enableTest, "Add a secret", async () => {
            // Arrange
            const secretDisplayName = "secret display name";

            // Act
            const secretInfo = await aadService.addSecret(aadObjectId, secretDisplayName);

            // Assert
            chai.assert.equal(secretInfo?.displayName, secretDisplayName);
            const queryResult = await aadService.getAad(aadObjectId);
            chai.assert.isNotEmpty(queryResult);
            chai.assert.equal(queryResult?.passwordCredentials?.length, 1);
            chai.assert.equal(queryResult?.passwordCredentials?.pop()?.displayName, secretDisplayName);
        });
    });



    describe("#updateAad()", () => {
        let aadObjectId: string;

        before_if(EnvConfig.enableTest, async () => {
            const aadInfo = await aadService?.createAad(UT_AAD_NAME);
            aadObjectId = aadInfo.id ?? "";
        });

        const testData: { message: string, updateData: IAadInfo }[] = [
            { message: "empty redirectUris", updateData: { web: { redirectUris: [] } } },
            { message: "one redirectUris", updateData: { web: { redirectUris: ["https://www.test-redirect-url.com/login"] } } },
            { message: "multiple redirectUris", updateData: { web: { redirectUris: ["https://www.test-redirect-url-1.com/login", "https://www.test-redirect-url-2.com/login"] } } },
        ];

        testData.forEach((data) => {
            it_if(EnvConfig.enableTest, data.message, async () => {
                // Act
                await aadService.updateAad(aadObjectId, data.updateData);

                // Assert
                const queryResult = await aadService.getAad(aadObjectId);
                chai.assert.isNotEmpty(queryResult);
                chai.assert.equal(queryResult?.web?.redirectUris?.length, data.updateData?.web?.redirectUris?.length);
                chai.assert.deepEqual(queryResult?.web?.redirectUris?.sort(), data.updateData?.web?.redirectUris?.sort());
            });
        });
    });

    describe("#createServicePrincipalIfNotExists()", () => {
        const sandbox = sinon.createSandbox();
        let aadClientId: string;
        let existingServicePrincipalAadClientId: string;

        before_if(EnvConfig.enableTest, async () => {
            const aadInfo = await aadService?.createAad(UT_AAD_NAME);
            aadClientId = aadInfo.appId ?? "";
            const existingServicePrincipalAadInfo = await aadService?.createAad(UT_AAD_NAME);
            existingServicePrincipalAadClientId = existingServicePrincipalAadInfo.appId ?? "";
        });

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "create service principal", async () => {
            // Arrange 
            const spy = sandbox.spy(axiosInstance, "request");

            // Act
            await aadService.createServicePrincipalIfNotExists(aadClientId);

            // Assert
            sinon.assert.calledTwice(spy);
            const queryResult = await aadService.getServicePrincipals(aadClientId);
            chai.assert.isNotEmpty(queryResult);
            chai.assert.equal(queryResult.length, 1);
        });

        it_if(EnvConfig.enableTest, "skip to create service principal if it is existing", async () => {
            // Arrange 
            await aadService.createServicePrincipalIfNotExists(existingServicePrincipalAadClientId);
            const spy = sandbox.spy(axiosInstance, "request");

            // Act
            await aadService.createServicePrincipalIfNotExists(existingServicePrincipalAadClientId);

            // Assert
            sinon.assert.calledOnce(spy);
            const queryResult = await aadService.getServicePrincipals(existingServicePrincipalAadClientId);
            chai.assert.isNotEmpty(queryResult);
            chai.assert.equal(queryResult.length, 1);
        });
    });
});

async function buildService(): Promise<{ axiosInstance: AxiosInstance, aadService: AadService, aadTestHelper: AadHelper }> {
    const mockGraphTokenProvider = new MockGraphTokenProvider(EnvConfig.tenantId, EnvConfig.servicePrincipalClientId, EnvConfig.servicePrincipalClientSecret);
    const graphToken = await mockGraphTokenProvider.getAccessToken();
    const axiosInstance = axios.create({
        baseURL: AadDefaultValues.graphApiBasePath,
        headers: {
            authorization: `Bearer ${graphToken}`,
            "content-type": "application/json",
        },
    });

    return { axiosInstance: axiosInstance, aadService: new AadService(axiosInstance), aadTestHelper: new AadHelper(axiosInstance) };
}
