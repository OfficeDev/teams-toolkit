// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import sinon from "sinon";
import { v4 } from "uuid";
import fs from "fs-extra";
import md5 from "md5";
import { after_if, before_if, MockAzureAccountProvider, it_if, ApimHelper, EnvConfig } from "./testUtil";
import { ApimService } from "../../../../../src/plugins/resource/apim/src/service/apimService";
import { OpenApiSchemaVersion } from "../../../../../src/plugins/resource/apim/src/model/openApiDocument";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { AssertNotEmpty } from "../../../../../src/plugins/resource/apim/src/error";
dotenv.config();
chai.use(chaiAsPromised);

const UT_SUFFIX = v4().substring(0, 6);
const UT_RESOURCE_GROUP = "localtest";
const UT_APIM_NAME = `fx-apim-local-unit-test-${UT_SUFFIX}`;
const UT_PRODUCT_NAME = "fx-apim-local-unit-test-product";
const UT_OAUTH_SERVER_NAME = "fx-apim-local-unit-test-oauth-server";
const UT_API_NAME = "fx-apim-local-unit-test-api";
const UT_TEST_DATA_FOLDER = "./tests/plugins/resource/apim/unit/data/apimService";

describe("ApimService", () => {
    let apimClient: ApiManagementClient;
    let apimService: ApimService;
    let apimHelper: ApimHelper;

    before_if(EnvConfig.enableTest, async () => {
        const result = await buildService();
        apimClient = result.apiManagementClient;
        apimService = result.apimService;
        apimHelper = result.apimHelper;

        await apimClient.apiManagementService.createOrUpdate(UT_RESOURCE_GROUP, UT_APIM_NAME,
            {
                publisherName: "fx-apim-ut@microsoft.com",
                publisherEmail: "fx-apim-ut@microsoft.com",
                sku: {
                    name: "Consumption",
                    capacity: 0,
                },
                location: EnvConfig.defaultLocation,
            });
    });

    after_if(EnvConfig.enableTest, async () => {
        await apimHelper.deleteApim(UT_RESOURCE_GROUP, UT_APIM_NAME);
    });

    describe("#getService()", () => {
        const sandbox = sinon.createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "not exist", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.apiManagementService, "get");

            // Act & Assert
            chai.expect(await apimService.getService(UT_RESOURCE_GROUP, "not-exist-service")).to.equal(undefined);
            sinon.assert.calledOnce(spy);
        });

        it_if(EnvConfig.enableTest, "exist", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.apiManagementService, "get");

            // Act & Assert
            chai.expect(await apimService.getService(UT_RESOURCE_GROUP, UT_APIM_NAME)).to.not.equal(undefined);
            sinon.assert.calledOnce(spy);
        });

        it_if(EnvConfig.enableTest, "not exist resource group", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.apiManagementService, "get");

            // Act & Assert
            await chai.expect(apimService.getService("not-exist-resource-group", UT_APIM_NAME)).to.be.rejectedWith();
            sinon.assert.calledOnce(spy);
        });
    });

    describe("#listService()", () => {
        const sandbox = sinon.createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "find service", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.apiManagementService, "list");

            // Act & Assert
            chai.expect(await apimService.listService()).to.deep.include({
                serviceName: UT_APIM_NAME,
                resourceGroupName: UT_RESOURCE_GROUP,
            });
            sinon.assert.calledOnce(spy);
        });
    });

    describe("#createService()", () => {
        const sandbox = sinon.createSandbox();
        const newServiceName = `${UT_APIM_NAME}-create`;

        afterEach(() => {
            sandbox.restore();
        });

        after_if(EnvConfig.enableTest, async () => {
            await apimHelper.deleteApim(UT_RESOURCE_GROUP, newServiceName);
        });

        it_if(EnvConfig.enableTest, "create a new service", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.apiManagementService, "createOrUpdate");

            // Act
            await apimService.createService(UT_RESOURCE_GROUP, newServiceName, EnvConfig.defaultLocation);

            // Assert
            sinon.assert.calledOnce(spy);
            const result = await apimService.getService(UT_RESOURCE_GROUP, newServiceName);
            chai.assert.exists(result);
        });

        it_if(EnvConfig.enableTest, "skip an existing service", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.apiManagementService, "createOrUpdate");

            // Act
            await apimService.createService(UT_RESOURCE_GROUP, UT_APIM_NAME, EnvConfig.defaultLocation);

            // Assert
            sinon.assert.notCalled(spy);
        });
    });

    describe("#createProduct()", () => {
        const sandbox = sinon.createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "create a new product", async () => {
            // Arrange
            const newProductName = `${UT_PRODUCT_NAME}-create`;
            const spy = sandbox.spy(apimClient.product, "createOrUpdate");

            // Act
            await apimService.createProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, newProductName);

            // Assert
            sinon.assert.calledOnce(spy);
            const result = await apimService.getProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, newProductName);
            chai.assert.exists(result);
            chai.assert.isFalse(result?.subscriptionRequired);
        });

        it_if(EnvConfig.enableTest, "skip an existing product", async () => {
            // Arrange
            const existingProductName = `${UT_PRODUCT_NAME}-existing`;
            await apimService.createProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, existingProductName);
            const spy = sandbox.spy(apimClient.product, "createOrUpdate");

            // Act
            await apimService.createProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, existingProductName);

            // Assert
            sinon.assert.notCalled(spy);
        });
    });

    describe("#createOrUpdateOAuthService()", () => {
        const sandbox = sinon.createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "create a new OAuth server", async () => {
            // Arrange
            const newOAuthServerName = `${UT_OAUTH_SERVER_NAME}-create`;
            const spy = sandbox.spy(apimClient.authorizationServer, "createOrUpdate");

            // Act
            await apimService.createOrUpdateOAuthService(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                newOAuthServerName,
                "tenant-id",
                "test-client-id",
                "test-client-secret",
                "api://scope"
            );

            // Assert
            sinon.assert.calledOnce(spy);
            const oAuthServer = await apimService.getOAuthServer(UT_RESOURCE_GROUP, UT_APIM_NAME, newOAuthServerName);
            chai.assert.isTrue(!!oAuthServer);
            chai.assert.equal(oAuthServer?.name, newOAuthServerName);
            chai.assert.equal(oAuthServer?.authorizationEndpoint, `https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize`);
            chai.assert.equal(oAuthServer?.tokenEndpoint, `https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token`);
            chai.assert.equal(oAuthServer?.displayName, newOAuthServerName);
            chai.assert.equal(oAuthServer?.clientId, "test-client-id");
            chai.assert.equal(oAuthServer?.defaultScope, "api://scope");
        });

        it_if(EnvConfig.enableTest, "update an existing OAuth server", async () => {
            // Arrange
            const updateOAuthServerName = `${UT_OAUTH_SERVER_NAME}-update`;
            await apimService.createOrUpdateOAuthService(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                updateOAuthServerName,
                "tenant-id",
                "test-client-id",
                "test-client-secret",
                "api://scope"
            );

            const spy = sandbox.spy(apimClient.authorizationServer, "createOrUpdate");

            // Act
            const testSuffix = v4().substring(0, 6);
            await apimService.createOrUpdateOAuthService(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                updateOAuthServerName,
                `tenant-id-${testSuffix}`,
                `client-id-${testSuffix}`,
                `client-secret-${testSuffix}`,
                `api://${testSuffix}`
            );

            // Assert
            sinon.assert.calledOnce(spy);
            const oAuthServer = await apimService.getOAuthServer(UT_RESOURCE_GROUP, UT_APIM_NAME, updateOAuthServerName);
            chai.assert.isTrue(!!oAuthServer);
            chai.assert.equal(oAuthServer?.name, updateOAuthServerName);
            chai.assert.equal(oAuthServer?.authorizationEndpoint, `https://login.microsoftonline.com/tenant-id-${testSuffix}/oauth2/v2.0/authorize`);
            chai.assert.equal(oAuthServer?.tokenEndpoint, `https://login.microsoftonline.com/tenant-id-${testSuffix}/oauth2/v2.0/token`);
            chai.assert.equal(oAuthServer?.displayName, updateOAuthServerName);
            chai.assert.equal(oAuthServer?.clientId, `client-id-${testSuffix}`);
            chai.assert.equal(oAuthServer?.defaultScope, `api://${testSuffix}`);
        });
    });

    describe("#createVersionSet()", () => {
        const sandbox = sinon.createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "create a new version set", async () => {
            // Arrange
            const newVersionSetId = md5(`${UT_API_NAME}-create`);
            const spy = sandbox.spy(apimClient.apiVersionSet, "createOrUpdate");

            // Act
            await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, newVersionSetId, UT_API_NAME);

            // Assert
            sinon.assert.calledOnce(spy);
            const versionSetResult = await apimService.getVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, newVersionSetId);
            chai.assert.equal(versionSetResult?.displayName, UT_API_NAME);
        });

        it_if(EnvConfig.enableTest, "skip to create an existing version set", async () => {
            // Arrange
            const existingVersionSetId = md5(`${UT_API_NAME}-existing`);
            await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, existingVersionSetId, UT_API_NAME);
            const spy = sandbox.spy(apimClient.apiVersionSet, "createOrUpdate");

            // Act
            await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, existingVersionSetId, UT_API_NAME);

            // Assert
            sinon.assert.notCalled(spy);
        });
    });

    describe("#importApi()", async () => {
        const sandbox = sinon.createSandbox();
        const newApiName = `${UT_API_NAME}-create`;
        const newVersionSetId = md5(newApiName);
        const existingApiName = `${UT_API_NAME}-existing`;
        const existingVersionSetId = md5(existingApiName);

        before_if(EnvConfig.enableTest, async () => {
            await apimService.createOrUpdateOAuthService(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                UT_OAUTH_SERVER_NAME,
                "tenant-id",
                "test-client-id",
                "test-client-secret",
                "api://scope"
            );
            await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, newVersionSetId);
            await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, existingVersionSetId);
        });

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "create a new API", async () => {
            // Arrange
            const newApiId = `${newApiName}-v1`;
            const spec = await loadSpec("create");
            const spy = sandbox.spy(apimClient.api, "createOrUpdate");

            // Act
            await apimService.importApi(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                newApiId,
                newApiName,
                "v1",
                newVersionSetId,
                UT_OAUTH_SERVER_NAME,
                OpenApiSchemaVersion.V3,
                spec
            );

            // Assert
            sinon.assert.calledOnce(spy);
            const api = await apimService.getApi(UT_RESOURCE_GROUP, UT_APIM_NAME, newApiId);
            chai.assert.equal(api?.displayName, spec.info.title);
            chai.assert.include(api?.apiVersionSetId, newVersionSetId);
            chai.assert.equal(api?.authenticationSettings?.oAuth2?.authorizationServerId, UT_OAUTH_SERVER_NAME);
            chai.assert.equal(api?.path, newApiName);
            chai.assert.equal(api?.apiVersion, "v1");
        });

        it_if(EnvConfig.enableTest, "create a new API version", async () => {
            // Arrange
            const existingApiId = `${existingApiName}-v1`;
            const spec = await loadSpec("existing");
            await apimService.importApi(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                existingApiId,
                existingApiName,
                "v1",
                existingVersionSetId,
                UT_OAUTH_SERVER_NAME,
                OpenApiSchemaVersion.V3,
                spec
            );

            const newVersionApiId = `${existingApiName}-v2`;
            const newSpec = await loadSpec("existing");
            const spy = sandbox.spy(apimClient.api, "createOrUpdate");

            // Act
            await apimService.importApi(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                newVersionApiId,
                existingApiName,
                "v2",
                existingVersionSetId,
                UT_OAUTH_SERVER_NAME,
                OpenApiSchemaVersion.V3,
                newSpec
            );

            // Assert
            sinon.assert.calledOnce(spy);
            const api = await apimService.getApi(UT_RESOURCE_GROUP, UT_APIM_NAME, newVersionApiId);
            chai.assert.equal(api?.displayName, spec.info.title);
            chai.assert.include(api?.apiVersionSetId, existingVersionSetId);
            chai.assert.equal(api?.authenticationSettings?.oAuth2?.authorizationServerId, UT_OAUTH_SERVER_NAME);
            chai.assert.equal(api?.path, existingApiName);
            chai.assert.equal(api?.apiVersion, "v2");
        });

        it_if(EnvConfig.enableTest, "update an existing API version", async () => {
            // Arrange
            const existingApiId = `${existingApiName}-v1`;
            const spec = await loadSpec("existing");
            await apimService.importApi(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                existingApiId,
                existingApiName,
                "v1",
                existingVersionSetId,
                UT_OAUTH_SERVER_NAME,
                OpenApiSchemaVersion.V3,
                spec
            );

            const newSpec = await loadSpec("existing-version");
            const spy = sandbox.spy(apimClient.api, "createOrUpdate");

            // Act
            await apimService.importApi(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                existingApiId,
                existingApiName,
                "v1",
                existingVersionSetId,
                UT_OAUTH_SERVER_NAME,
                OpenApiSchemaVersion.V3,
                newSpec
            );

            // Assert
            sinon.assert.calledOnce(spy);
            const api = await apimService.getApi(UT_RESOURCE_GROUP, UT_APIM_NAME, existingApiId);
            chai.assert.equal(api?.displayName, newSpec.info.title);
            chai.assert.include(api?.apiVersionSetId, existingVersionSetId);
            chai.assert.equal(api?.authenticationSettings?.oAuth2?.authorizationServerId, UT_OAUTH_SERVER_NAME);
            chai.assert.equal(api?.path, existingApiName);
            chai.assert.equal(api?.apiVersion, "v1");
        });
    });

    describe("#addApiToProduct()", () => {
        const sandbox = sinon.createSandbox();
        const newApiName = `${UT_API_NAME}-add-api-2-product`;
        const newApiId = `${newApiName}-v1`;

        before_if(EnvConfig.enableTest, async () => {
            await apimService.createOrUpdateOAuthService(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                UT_OAUTH_SERVER_NAME,
                "tenant-id",
                "test-client-id",
                "test-client-secret",
                "api://scope"
            );
            await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, md5(newApiName));
            const spec = await loadSpec(newApiName);
            await apimService.importApi(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                newApiId,
                newApiName,
                "v1",
                md5(newApiName),
                UT_OAUTH_SERVER_NAME,
                OpenApiSchemaVersion.V3,
                spec
            );
            await apimService.createProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, UT_PRODUCT_NAME);
        });

        afterEach(() => {
            sandbox.restore();
        });

        it_if(EnvConfig.enableTest, "add api to a product", async () => {
            // Arrange
            const spy = sandbox.spy(apimClient.productApi, "createOrUpdate");

            // Act
            await apimService.addApiToProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, UT_PRODUCT_NAME, newApiId);
            await apimService.addApiToProduct(UT_RESOURCE_GROUP, UT_APIM_NAME, UT_PRODUCT_NAME, newApiId);

            // Assert
            sinon.assert.calledOnce(spy);
        });
    });

    describe("#listApi()", () => {
        const sandbox = sinon.createSandbox();
        const testData: { apiName: string, apiVersions: string[] }[] = [
            { apiName: `${UT_API_NAME}-list-0`, apiVersions: [] },
            { apiName: `${UT_API_NAME}-list-1`, apiVersions: ["v1"] },
            { apiName: `${UT_API_NAME}-list-2`, apiVersions: ["v1", "v2"] },
        ];
        before_if(EnvConfig.enableTest, async () => {
            await apimService.createOrUpdateOAuthService(
                UT_RESOURCE_GROUP,
                UT_APIM_NAME,
                UT_OAUTH_SERVER_NAME,
                "tenant-id",
                "test-client-id",
                "test-client-secret",
                "api://scope"
            );

            for (const data of testData) {
                await apimService.createVersionSet(UT_RESOURCE_GROUP, UT_APIM_NAME, md5(data.apiName));
                for (const apiVersion of data.apiVersions) {
                    const spec = await loadSpec(data.apiName);
                    const apiId = `${data.apiName}-${apiVersion}`;
                    await apimService.importApi(
                        UT_RESOURCE_GROUP,
                        UT_APIM_NAME,
                        apiId,
                        data.apiName,
                        apiVersion,
                        md5(data.apiName),
                        UT_OAUTH_SERVER_NAME,
                        OpenApiSchemaVersion.V3,
                        spec
                    );
                }
            }
        });

        afterEach(() => {
            sandbox.restore();
        });

        testData.forEach((data) => {
            it_if(EnvConfig.enableTest, `list ${data.apiVersions.length} api in a version set`, async () => {
                // Arrange
                const spy = sandbox.spy(apimClient.api, "listByService");

                // Act
                const apis = await apimService.listApi(UT_RESOURCE_GROUP, UT_APIM_NAME, md5(data.apiName));

                // Assert
                sinon.assert.calledOnce(spy);
                chai.assert.equal(apis.length, data.apiVersions.length);
                chai.assert.includeMembers(apis.map(api => api.name), data.apiVersions.map((apiVersion) => `${data.apiName}-${apiVersion}`));
            });
        });
    });
});

async function buildService(): Promise<{ apiManagementClient: ApiManagementClient; apimService: ApimService; apimHelper: ApimHelper }> {
    const mockAzureAccountProvider = new MockAzureAccountProvider();
    await mockAzureAccountProvider.login(EnvConfig.servicePrincipalClientId, EnvConfig.servicePrincipalClientSecret, EnvConfig.tenantId);
    const credential = AssertNotEmpty("credential", await mockAzureAccountProvider.getAccountCredentialAsync());
    const apiManagementClient = new ApiManagementClient(credential, EnvConfig.subscriptionId);
    const apimService = new ApimService(apiManagementClient, credential, EnvConfig.subscriptionId);
    const apimHelper = new ApimHelper(apiManagementClient);
    return { apiManagementClient, apimService, apimHelper };
}

async function loadSpec(titleSuffix: string): Promise<any> {
    const spec = await fs.readJson(`${UT_TEST_DATA_FOLDER}/openapi.json`, { encoding: "utf-8" });
    spec.info.title = `${spec.info.title}-${titleSuffix}`;
    return spec;
}
