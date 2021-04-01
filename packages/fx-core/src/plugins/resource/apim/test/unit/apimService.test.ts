// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as dotenv from 'dotenv';
import * as sinon from 'sinon';
import * as uuid from 'uuid';
import * as fs from 'fs-extra';
import * as md5 from 'md5';
import { MockAzureAccountProvider, MockTelemetryReporter, skip_if } from './testUtil';
import { ApimService } from '../../src/service/apimService';
import { OpenApiSchemaVersion } from '../../src/model/openApiDocument';
import { Telemetry } from '../../src/telemetry';
import { assert } from 'sinon';
import { ApiManagementClient } from '@azure/arm-apimanagement';
dotenv.config();
chai.use(chaiAsPromised);

const enableTest: boolean = process.env.UT_TEST_ON_AZURE ? process.env.UT_TEST_ON_AZURE === 'true' : false;
const enableCreateTest: boolean = process.env.UT_TEST_CREATE ? process.env.UT_TEST_CREATE === 'true' : false;

const testResourceGroup: string = process.env.UT_RESOURCE_GROUP ?? 'localtest';
const testApim: string = process.env.UT_API_MANAGEMENT ?? 'teamsfx-plugin-apim-ut';
const testSubscriptionId: string = process.env.UT_SUBSCRIPTION_ID ?? '';
const testServicePrincipalClientId: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_ID ?? '';
const testServicePrincipalClientSecret: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_SECRET ?? '';
const testTenantId: string = process.env.UT_TENANT_ID ?? '';
const testLocation: string = process.env.UT_LOCATION ?? '';
const testCreateSuffix: string = process.env.UT_CREATE_SUFFIX ?? uuid.v4().substring(0, 6);
const testProduct: string = process.env.UT_PRODUCT ?? '';
const testOAuthServer: string = process.env.UT_OAUTH_SERVER ?? '';
const testApiName: string = process.env.UT_API_NAME ?? '';
const testApiVersion: string = process.env.UT_API_VERSION ?? '';

describe('ApimService', () => {
    let apimClient: ApiManagementClient;
    let apimService: ApimService;
    before(async () => {
        if (enableTest) {
            const result = await buildService();
            apimClient = result.apiManagementClient;
            apimService = result.apimService;
        }
    });

    describe('#getService()', () => {
        skip_if(!enableTest, 'not exist', async () => {
            chai.expect(await apimService.getService(testResourceGroup, 'not-exist-service')).to.equal(undefined);
        });
        skip_if(!enableTest, 'exist', async () => {
            chai.expect(await apimService.getService(testResourceGroup, testApim)).to.not.equal(undefined);
        });
        skip_if(!enableTest, 'not exist resource group', async () => {
            await chai.expect(apimService.getService('not-exist-resource-group', testApim)).to.be.rejectedWith();
        });
    });
    describe('#listService()', () => {
        skip_if(!enableTest, 'find service', async () => {
            chai.expect(await apimService.listService()).to.deep.include({
                serviceName: testApim,
                resourceGroupName: testResourceGroup,
            });
        });
    });

    describe('#createService()', () => {
        const sandbox = sinon.createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        skip_if(!enableTest || !enableCreateTest, 'create a new service', async () => {
            const spy = sandbox.spy(apimClient.apiManagementService, 'createOrUpdate');
            await apimService.createService(testResourceGroup, `${testApim}-${testCreateSuffix}`, testLocation);
            assert.calledOnce(spy);
        });

        skip_if(!enableTest, 'skip an existing service', async () => {
            const spy = sandbox.spy(apimClient.apiManagementService, 'createOrUpdate');
            await apimService.createService(testResourceGroup, testApim, testLocation);
            assert.notCalled(spy);
        });
    });

    describe('#createProduct()', () => {
        const sandbox = sinon.createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        skip_if(!enableTest, 'create a new product', async () => {
            const spy = sandbox.spy(apimClient.product, 'createOrUpdate');
            await apimService.createProduct(testResourceGroup, testApim, `${testProduct}-${testCreateSuffix}`);
            assert.calledOnce(spy);
        });

        skip_if(!enableTest, 'skip an existing product', async () => {
            const spy = sandbox.spy(apimClient.product, 'createOrUpdate');
            await apimService.createProduct(testResourceGroup, testApim, testProduct);
            assert.notCalled(spy);
        });
    });

    describe('#createOrUpdateOAuthService()', () => {
        const sandbox = sinon.createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        skip_if(!enableTest, 'create a new OAuth server', async () => {
            const spy = sandbox.spy(apimClient.authorizationServer, 'createOrUpdate');
            const oAuthServerName = `${testOAuthServer}-${testCreateSuffix}`;
            await apimService.createOrUpdateOAuthService(
                testResourceGroup,
                testApim,
                oAuthServerName,
                'tenant-id',
                'test-client-id',
                'test-client-secret',
                'api://scope',
            );
            assert.calledOnce(spy);

            const oAuthServer = await apimService.getOAuthServer(testResourceGroup, testApim, oAuthServerName);
            chai.assert.isTrue(!!oAuthServer);
            chai.assert.equal(oAuthServerName, oAuthServer?.name);
            chai.assert.equal(
                `https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize`,
                oAuthServer?.authorizationEndpoint,
            );
            chai.assert.equal(
                `https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token`,
                oAuthServer?.tokenEndpoint,
            );
            chai.assert.equal(oAuthServerName, oAuthServer?.displayName);
            chai.assert.equal('test-client-id', oAuthServer?.clientId);
            chai.assert.equal('api://scope', oAuthServer?.defaultScope);
        });

        skip_if(!enableTest, 'update an existing OAuth server', async () => {
            const spy = sandbox.spy(apimClient.authorizationServer, 'createOrUpdate');

            const testSuffix = uuid.v4().substring(0, 6);
            await apimService.createOrUpdateOAuthService(
                testResourceGroup,
                testApim,
                testOAuthServer,
                `tenant-id-${testSuffix}`,
                `client-id-${testSuffix}`,
                `client-secret-${testSuffix}`,
                `api://${testSuffix}`,
            );

            assert.calledOnce(spy);

            const oAuthServer = await apimService.getOAuthServer(testResourceGroup, testApim, testOAuthServer);
            chai.assert.isTrue(!!oAuthServer);
            chai.assert.equal(testOAuthServer, oAuthServer?.name);
            chai.assert.equal(
                `https://login.microsoftonline.com/tenant-id-${testSuffix}/oauth2/v2.0/authorize`,
                oAuthServer?.authorizationEndpoint,
            );
            chai.assert.equal(
                `https://login.microsoftonline.com/tenant-id-${testSuffix}/oauth2/v2.0/token`,
                oAuthServer?.tokenEndpoint,
            );
            chai.assert.equal(testOAuthServer, oAuthServer?.displayName);
            chai.assert.equal(`client-id-${testSuffix}`, oAuthServer?.clientId);
            chai.assert.equal(`api://${testSuffix}`, oAuthServer?.defaultScope);
        });
    });

    describe('#createVersionSet()', () => {
        const sandbox = sinon.createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        skip_if(!enableTest, 'create a new version set', async () => {
            const spy = sandbox.spy(apimClient.apiVersionSet, 'createOrUpdate');
            const testNewVersionSetName = `${testApiName}-versionset-${testCreateSuffix}`;
            const testNewVersionSetId = md5(testNewVersionSetName);
            await apimService.createVersionSet(testResourceGroup, testApim, testNewVersionSetId, testNewVersionSetName);
            assert.calledOnce(spy);
            const versionSetResult = await apimService.getVersionSet(testResourceGroup, testApim, testNewVersionSetId);
            chai.assert.equal(testNewVersionSetName, versionSetResult?.displayName);
        });

        skip_if(!enableTest, 'skip to create an existing version set', async () => {
            const spy = sandbox.spy(apimClient.apiVersionSet, 'createOrUpdate');
            const testVersionSetId = md5(testApiName);
            await apimService.createVersionSet(testResourceGroup, testApim, testVersionSetId, testApiName);
            assert.notCalled(spy);
        });
    });

    describe('#importApi()', () => {
        skip_if(!enableTest || !enableCreateTest, 'create a new API', async () => {
            const spec = await fs.readJson('./test/unit/data/apimService/openapi.json', { encoding: 'utf-8' });
            const testNewApiName = `${testApiName}-api-${testCreateSuffix}`;
            const testNewApiVersion = `version-${testCreateSuffix}`;
            const testNewVersionSetId = md5(testNewApiName);
            spec.info.title = `${spec.info.title}-${testCreateSuffix}`;
            await apimService.createVersionSet(testResourceGroup, testApim, testNewVersionSetId, testNewApiName);
            await apimService.importApi(
                testResourceGroup,
                testApim,
                testNewApiName,
                testNewApiName,
                testNewApiVersion,
                testNewVersionSetId,
                testOAuthServer,
                OpenApiSchemaVersion.v3,
                spec,
            );
            const api = await apimService.getApi(testResourceGroup, testApim, testNewApiName);
            chai.assert.equal(spec.info.title, api?.displayName);
        });

        skip_if(!enableTest, 'create a new API version', async () => {
            const testNewApiName = `${testApiName}-api-${testCreateSuffix}`;
            const testNewApiVersion = `version-${testCreateSuffix}`;
            const testVersionSetId = md5(testApiName);
            const spec = await fs.readJson('./test/unit/data/apimService/openapi.json', { encoding: 'utf-8' });

            await apimService.importApi(
                testResourceGroup,
                testApim,
                testNewApiName,
                testNewApiName,
                testNewApiVersion,
                testVersionSetId,
                testOAuthServer,
                OpenApiSchemaVersion.v3,
                spec,
            );
            const api = await apimService.getApi(testResourceGroup, testApim, testNewApiName);
            chai.assert.equal(spec.info.title, api?.displayName);
        });

        skip_if(!enableTest, 'update an existing API version', async () => {
            const spec = await fs.readJson('./test/unit/data/apimService/swagger.json', { encoding: 'utf-8' });
            const testVersionSetId = md5(testApiName);
            spec.info.title = `${spec.info.title}-${testCreateSuffix}`;
            await apimService.importApi(
                testResourceGroup,
                testApim,
                testApiName,
                testApiName,
                testApiVersion,
                testVersionSetId,
                testOAuthServer,
                OpenApiSchemaVersion.v2,
                spec,
            );
            const api = await apimService.getApi(testResourceGroup, testApim, testApiName);
            chai.assert.equal(spec.info.title, api?.displayName);
        });
    });

    describe('#addApiToProduct()', () => {
        const sandbox = sinon.createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        skip_if(!enableTest, 'add api to a product', async () => {
            const spy = sandbox.spy(apimClient.productApi, 'createOrUpdate');

            const spec = await fs.readJson('./test/unit/data/apimService/openapi.json', { encoding: 'utf-8' });
            const testNewApiName = `${testApiName}-addApiToProduct-${testCreateSuffix}`;
            const testNewApiVersion = `version-${testCreateSuffix}`;
            const testNewVersionSetId = md5(testNewApiName);
            spec.info.title = `${spec.info.title}-${testCreateSuffix}`;
            await apimService.createVersionSet(testResourceGroup, testApim, testNewVersionSetId, testNewApiName);
            await apimService.importApi(
                testResourceGroup,
                testApim,
                testNewApiName,
                testNewApiName,
                testNewApiVersion,
                testNewVersionSetId,
                testOAuthServer,
                OpenApiSchemaVersion.v3,
                spec,
            );
            await apimService.createProduct(
                testResourceGroup,
                testApim,
                `${testProduct}-addApiToProduct-${testCreateSuffix}`,
            );

            await apimService.addApiToProduct(
                testResourceGroup,
                testApim,
                `${testProduct}-addApiToProduct-${testCreateSuffix}`,
                testNewApiName,
            );

            assert.calledOnce(spy);
        });

        skip_if(!enableTest, 'skip to add api to a product', async () => {
            const spy = sandbox.spy(apimClient.productApi, 'createOrUpdate');
            await apimService.addApiToProduct(testResourceGroup, testApim, `${testProduct}`, testApiName);
            assert.calledOnce(spy);
        });
    });

    describe('#listApi()', () => {
        skip_if(!enableTest, 'list api in a version set', async () => {
            const testVersionSetId = md5(testApiName);
            const apis = await apimService.listApi(testResourceGroup, testApim, testVersionSetId);
            chai.assert.isNotEmpty(apis);
            for (let api of apis) {
                chai.assert.include(api.apiVersionSetId, testVersionSetId);
            }
        });
    });
});

async function buildService(): Promise<{ apiManagementClient: ApiManagementClient; apimService: ApimService }> {
    const mockTelemetry = new Telemetry();
    const mockAzureAccountProvider = new MockAzureAccountProvider();
    await mockAzureAccountProvider.login(testServicePrincipalClientId, testServicePrincipalClientSecret, testTenantId);
    const credential = await mockAzureAccountProvider.getAccountCredentialAsync();
    const apiManagementClient = new ApiManagementClient(credential!, testSubscriptionId);
    const apimService = new ApimService(apiManagementClient, credential!, testSubscriptionId, mockTelemetry);
    return { apiManagementClient, apimService };
}
