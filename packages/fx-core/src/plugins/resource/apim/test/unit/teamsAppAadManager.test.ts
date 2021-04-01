import 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as dotenv from 'dotenv';
import { MockGraphTokenProvider, skip_if } from './testUtil';
import { AadService } from '../../src/service/aadService';
import { Telemetry } from '../../src/telemetry';
import { IAadPluginConfig } from '../../src/model/config';
import { TeamsAppAadManager } from '../../src/manager/teamsAppAadManager';
import axios, { AxiosInstance } from 'axios';
import { AadDefaultValues } from '../../src/constants';
import { assert } from 'sinon';
dotenv.config();
chai.use(chaiAsPromised);

const enableTest: boolean = process.env.UT_TEST_AAD ? process.env.UT_TEST_AAD === 'true' : false;
const enableCreateTest: boolean = process.env.UT_TEST_CREATE ? process.env.UT_TEST_CREATE === 'true' : false
const testTenantId: string = process.env.UT_TENANT_ID ?? '';
const testClientId: string = process.env.UT_AAD_CLIENT_ID ?? '';

const testServicePrincipalClientId: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_ID ?? '';
const testServicePrincipalClientSecret: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_SECRET ?? '';
const testScopeObjectId: string = process.env.UT_AAD_SCOPE_OBJECT_ID ?? '';
const testScopeClientId: string = process.env.UT_AAD_SCOPE_CLIENT_ID ?? '';

describe('TeamsAppAadManager', () => {
    let teamsAppAadManager: TeamsAppAadManager;
    let aadService: AadService;
    let axios: AxiosInstance;
    before(async () => {
        const result = await buildService(enableTest);
        axios = result.axiosInstance;
        aadService = result.aadService;
        teamsAppAadManager = result.teamsAppAadManager;
    });

    describe('#postProvision()', () => {
        const sandbox = sinon.createSandbox();

        afterEach(function () {
            sandbox.restore();
        });

        skip_if(!enableTest || !enableCreateTest, 'Create a new service principal.', async () => {
            const aadInfo = await aadService.createAad("test-service-principal");
            chai.assert.isNotEmpty(aadInfo.appId);

            const spy = sandbox.spy(axios, 'request');
            const aadConfig = buildAadPluginConfig(aadInfo.id!, aadInfo.appId!);
            await teamsAppAadManager.postProvision(aadConfig, { apimClientAADClientId: testClientId });
            assert.calledThrice(spy);
            assert.calledWithMatch(spy, { method: 'get', url: `/servicePrincipals?$filter=appId eq '${aadInfo.appId!}'`, data: undefined });
            assert.calledWithMatch(spy, { method: 'post', url: `/servicePrincipals`, data: { appId: aadInfo.appId! } });
            assert.calledWithMatch(spy, { method: 'patch', url: `/applications/${aadInfo.id!}`, data: { api: { knownClientApplications: [testClientId] } } });
        });

        skip_if(!enableTest, 'Skip to create an existing service principal.', async () => {
            const spy = sandbox.spy(axios, 'request');
            const aadConfig = buildAadPluginConfig(testScopeObjectId, testScopeClientId);
            await teamsAppAadManager.postProvision(aadConfig, { apimClientAADClientId: testClientId });
            assert.calledTwice(spy);
            assert.calledWithMatch(spy, { method: 'get', url: `/servicePrisncipals?$filter=appId eq '${testScopeClientId}'`, data: undefined });
            assert.calledWithMatch(spy, { method: 'patch', url: `/applications/${testScopeObjectId}`, data: { api: { knownClientApplications: [testClientId] } } });
        });
    });
});


async function buildService(enableLogin: boolean): Promise<{ axiosInstance: AxiosInstance, aadService: AadService, teamsAppAadManager: TeamsAppAadManager }> {
    const mockTelemetry = new Telemetry();
    const mockGraphTokenProvider = new MockGraphTokenProvider(
        testTenantId,
        testServicePrincipalClientId,
        testServicePrincipalClientSecret,
    );
    const graphToken = enableLogin ? await mockGraphTokenProvider.getAccessToken() : '';
    const axiosInstance = axios.create({
        baseURL: AadDefaultValues.graphApiBasePath,
        headers: {
            authorization: `Bearer ${graphToken}`,
            'content-type': 'application/json',
        },
    });
    const aadService = new AadService(axiosInstance, mockTelemetry);;
    const teamsAppAadManager = new TeamsAppAadManager(aadService, new Telemetry());
    return { axiosInstance, aadService, teamsAppAadManager };
}

function buildAadPluginConfig(objectId: string, clientId: string): IAadPluginConfig {
    return {
        objectId: objectId,
        clientId: clientId,
        oauth2PermissionScopeId: "",
        applicationIdUris: "",
    };
}