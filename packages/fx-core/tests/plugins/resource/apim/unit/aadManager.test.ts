// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import axios from "axios";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import dotenv from "dotenv";
import { AadManager } from "../../../../../src/plugins/resource/apim/src/manager/aadManager";
import uuid from "uuid";
import { MockGraphTokenProvider, skip_if } from "./testUtil";
import { InvalidAadObjectId } from "../../../../../src/plugins/resource/apim/src/error";
import { IRequiredResourceAccess } from "../../../../../src/plugins/resource/apim/src/model/aadResponse";
import { AadService } from "../../../../../src/plugins/resource/apim/src/service/aadService";
import { Telemetry } from "../../../../../src/plugins/resource/apim/src/telemetry";
import { IAadPluginConfig, IApimPluginConfig, ISolutionConfig } from "../../../../../src/plugins/resource/apim/src/model/config";
import { AadDefaultValues } from "../../../../../src/plugins/resource/apim/src/constants";
import { Lazy } from "../../../../../src/plugins/resource/apim/src/util/lazy";
import { ApimService } from "../../../../../src/plugins/resource/apim/src/service/apimService";
dotenv.config();
chai.use(chaiAsPromised);

const enableTest: boolean = process.env.UT_TEST_AAD ? process.env.UT_TEST_AAD === "true" : false;
const enableCreateTest: boolean = process.env.UT_TEST_CREATE ? process.env.UT_TEST_CREATE === "true" : false;
const testTenantId: string = process.env.UT_TENANT_ID ?? "00000000-0000-4000-0000-000000000000";
const testServicePrincipalClientId: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_ID ?? "00000000-0000-4000-0000-000000000000";
const testServicePrincipalClientSecret: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_SECRET ?? "";

const testObjectId: string = process.env.UT_AAD_OBJECT_ID ?? "00000000-0000-4000-0000-000000000000";
const testSecret: string = process.env.UT_AAD_SECRET ?? "";
const testClientId: string = process.env.UT_AAD_CLIENT_ID ?? "00000000-0000-4000-0000-000000000000";
const testScopeClientId: string = process.env.UT_AAD_SCOPE_CLIENT_ID ?? "00000000-0000-4000-0000-000000000000";

describe("AadManager", () => {
    let aadManager: AadManager;
    let aadService: AadService;
    before(async () => {
        aadService = await buildAadService(enableTest);
        aadManager = buildAadManager(aadService);
    });

    describe("#provision()", () => {
        skip_if(!enableTest || !enableCreateTest, "Create a new AAD", async () => {
            const apimPluginConfig = buildApimPluginConfig();
            await aadManager.provision(apimPluginConfig, "teamsfx-test");

            chai.assert.isNotEmpty(apimPluginConfig.apimClientAADObjectId);
            chai.assert.isNotEmpty(apimPluginConfig.apimClientAADClientId);
            chai.assert.isNotEmpty(apimPluginConfig.apimClientAADClientSecret);

            const queryResult = await aadService.getAad(apimPluginConfig.apimClientAADObjectId!);
            chai.assert.isNotEmpty(queryResult);
        });

        skip_if(!enableTest || !enableCreateTest, "Use an existing AAD failed because of error object id", async () => {
            const apimPluginConfig = buildApimPluginConfig("00000000-0000-0000-0000-000000000000");

            await chai
                .expect(aadManager.provision(apimPluginConfig, "teamsfx-test"))
                .to.be.rejectedWith(InvalidAadObjectId.message("00000000-0000-0000-0000-000000000000"));
        });

        skip_if(!enableTest, "Use an existing AAD, using existing secret", async () => {
            const apimPluginConfig = buildApimPluginConfig(testObjectId, testSecret);

            await aadManager.provision(apimPluginConfig, "teamsfx-test");

            chai.assert.equal(testObjectId, apimPluginConfig.apimClientAADObjectId);
            chai.assert.equal(testClientId, apimPluginConfig.apimClientAADClientId);
            chai.assert.equal(testSecret, apimPluginConfig.apimClientAADClientSecret);
        });

        skip_if(!enableTest || !enableCreateTest, "Use an existing AAD, create new secret", async () => {
            const apimPluginConfig = buildApimPluginConfig(testObjectId);

            await aadManager.provision(apimPluginConfig, "teamsfx-test");

            chai.assert.equal(testObjectId, apimPluginConfig.apimClientAADObjectId);
            chai.assert.equal(testClientId, apimPluginConfig.apimClientAADClientId);
            chai.assert.notEqual(testSecret, apimPluginConfig.apimClientAADClientSecret);
        });
    });

    describe("#postProvision()", () => {
        skip_if(!enableTest, "Add a existing scope and add a new redirect url", async () => {
            const apimPluginConfig = buildApimPluginConfig(testObjectId);
            const existingScope = "00000000-0000-0000-0000-000000000000";
            const aadPluginConfig = buildAadPluginConfig(testScopeClientId, existingScope);
            const redirectUris = [`https://testredirect/${uuid.v4()}`];

            await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

            const updatedAad = await aadService.getAad(apimPluginConfig.apimClientAADObjectId!);
            chai.assert.isTrue(updatedAad?.web?.implicitGrantSettings?.enableIdTokenIssuance);
            chai.assert.exists(updatedAad?.web?.redirectUris);
            chai.assert.oneOf(redirectUris[0], updatedAad?.web?.redirectUris ?? []);
            const foundResourceAccess = updatedAad?.requiredResourceAccess?.find((x) => x.resourceAppId === testScopeClientId);
            chai.assert.exists(foundResourceAccess);
            chai.assert.includeDeepMembers(foundResourceAccess?.resourceAccess ?? [], [{ id: existingScope, type: "Scope" }]);
        });

        skip_if(!enableTest, "Add a new scope and existing redirect url", async () => {
            const apimPluginConfig = buildApimPluginConfig(testObjectId);
            const redirectUris = [`https://testredirect`, `https://testredirect/${uuid.v4()}`];
            const newScope = uuid.v4();
            const aadPluginConfig = buildAadPluginConfig(testScopeClientId, newScope);

            await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

            const updatedAad = await aadService.getAad(testObjectId);
            chai.assert.isTrue(updatedAad?.web?.implicitGrantSettings?.enableIdTokenIssuance);
            chai.assert.exists(updatedAad?.web?.redirectUris);
            chai.assert.oneOf(redirectUris[0], updatedAad?.web?.redirectUris ?? []);
            chai.assert.oneOf(redirectUris[1], updatedAad?.web?.redirectUris ?? []);
            const foundResourceAccess = updatedAad?.requiredResourceAccess?.find((x) => x.resourceAppId === testScopeClientId);
            chai.assert.exists(foundResourceAccess);
            chai.assert.includeDeepMembers(foundResourceAccess?.resourceAccess ?? [], [{ id: newScope, type: "Scope" }]);
        });

        skip_if(!enableTest, "Add existing scope and existing redirect url", async () => {
            const apimPluginConfig = buildApimPluginConfig(testObjectId);
            const redirectUris = [`https://testredirect`];
            const existingScope = "00000000-0000-0000-0000-000000000000";
            const aadPluginConfig = buildAadPluginConfig(testScopeClientId, existingScope);
            await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

            const updatedAad = await aadService.getAad(testObjectId);
            chai.assert.isTrue(updatedAad?.web?.implicitGrantSettings?.enableIdTokenIssuance);
            chai.assert.exists(updatedAad?.web?.redirectUris);
            chai.assert.oneOf(redirectUris[0], updatedAad?.web?.redirectUris ?? []);
            const foundResourceAccess = updatedAad?.requiredResourceAccess?.find((x) => x.resourceAppId === testScopeClientId);
            chai.assert.exists(foundResourceAccess);
            chai.assert.includeDeepMembers(foundResourceAccess?.resourceAccess ?? [], [{ id: existingScope, type: "Scope" }]);
        });
    });

    describe("#refreshRequiredResourceAccess()", () => {
        afterEach(() => {
            sinon.restore();
        });

        const testInput: {
            message: string;
            source: IRequiredResourceAccess[] | undefined;
            expected: IRequiredResourceAccess[] | undefined;
        }[] = [
                {
                    message: "Undefined source",
                    source: undefined,
                    expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
                },
                {
                    message: "Empty source",
                    source: [],
                    expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
                },
                {
                    message: "No existing client id",
                    source: [{ resourceAppId: "1" }],
                    expected: [{ resourceAppId: "1" }, { resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
                },
                {
                    message: "Existing client id and undefined resource access",
                    source: [{ resourceAppId: "0" }],
                    expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
                },
                {
                    message: "Existing client id and empty resource access",
                    source: [{ resourceAppId: "0", resourceAccess: [] }],
                    expected: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
                },
                {
                    message: "Existing client id and no scope id",
                    source: [{ resourceAppId: "0", resourceAccess: [{ id: "1", type: "Scope" }] }],
                    expected: [
                        {
                            resourceAppId: "0",
                            resourceAccess: [
                                { id: "1", type: "Scope" },
                                { id: "0", type: "Scope" },
                            ],
                        },
                    ],
                },
                {
                    message: "Existing client id and existing scope id",
                    source: [{ resourceAppId: "0", resourceAccess: [{ id: "0", type: "Scope" }] }],
                    expected: undefined,
                },
            ];

        testInput.forEach((input) => {
            it(input.message, async () => {
                sinon.stub(aadService, "getAad").callsFake((objectId: string) => Promise.resolve({ requiredResourceAccess: input.source }));
                const updateAadStub = sinon.stub(aadService, "updateAad").callsFake((objectId, data) => Promise.resolve());
                const aadPluginConfig = buildAadPluginConfig("0", "0");
                const apimPluginConfig = buildApimPluginConfig(testObjectId);
                await aadManager.postProvision(apimPluginConfig, aadPluginConfig, []);
                sinon.assert.calledWith(updateAadStub, testObjectId, sinon.match({ requiredResourceAccess: input.expected }));
            });
        });
    });

    describe("#refreshRedirectUri()", () => {
        afterEach(() => {
            sinon.restore();
        });

        const testInput: {
            message: string;
            source: string[] | undefined;
            added: string[];
            expected: string[] | undefined;
        }[] = [
                {
                    message: "Undefined source",
                    source: undefined,
                    added: ["https://added-url"],
                    expected: ["https://added-url"],
                },
                {
                    message: "Empty source",
                    source: [],
                    added: ["https://added-url"],
                    expected: ["https://added-url"],
                },
                {
                    message: "No existing redirect uri",
                    source: ["https://existing-url"],
                    added: ["https://added-url"],
                    expected: ["https://existing-url", "https://added-url"],
                },
                {
                    message: "Existing redirect uri",
                    source: ["https://existing-url", "https://added-url"],
                    added: ["https://added-url"],
                    expected: undefined,
                },
                {
                    message: "Add multiple redirect uris",
                    source: ["https://existing-url", "https://added-url"],
                    added: ["https://added-url", "https://added-url-1"],
                    expected: ["https://existing-url", "https://added-url", "https://added-url-1"],
                },
                {
                    message: "Not add uri",
                    source: ["https://existing-url", "https://added-url"],
                    added: [],
                    expected: undefined,
                },
            ];

        testInput.forEach((input) => {
            it(input.message, async () => {
                sinon.stub(aadService, "getAad").callsFake((objectId: string) => Promise.resolve({ web: { redirectUris: input.source } }));
                const updateAadStub = sinon.stub(aadService, "updateAad").callsFake((objectId, data) => Promise.resolve());
                const aadPluginConfig = buildAadPluginConfig("", "");
                const apimPluginConfig = buildApimPluginConfig(testObjectId);
                await aadManager.postProvision(apimPluginConfig, aadPluginConfig, input.added);
                sinon.assert.calledWith(updateAadStub, testObjectId, sinon.match({ web: { redirectUris: input.expected } }));
            });
        });
    });
});

async function buildAadService(enableLogin: boolean): Promise<AadService> {
    const mockTelemetry = new Telemetry();
    const mockGraphTokenProvider = new MockGraphTokenProvider(testTenantId, testServicePrincipalClientId, testServicePrincipalClientSecret);
    const graphToken = enableLogin ? await mockGraphTokenProvider.getAccessToken() : "";
    const axiosInstance = axios.create({
        baseURL: AadDefaultValues.graphApiBasePath,
        headers: {
            authorization: `Bearer ${graphToken}`,
            "content-type": "application/json",
        },
    });
    return new AadService(axiosInstance, mockTelemetry);
}

function buildAadManager(aadService: AadService): AadManager {
    const mockTelemetry = new Telemetry();
    const lazyAadService = new Lazy<AadService>(() => Promise.resolve(aadService));
    return new AadManager(lazyAadService, mockTelemetry);
}

function buildApimPluginConfig(objectId?: string, clientSecret?: string): IApimPluginConfig {
    return {
        apimClientAADObjectId: objectId,
        apimClientAADClientSecret: clientSecret,
    };
}

function buildAadPluginConfig(clientId: string, scopeId: string): IAadPluginConfig {
    return {
        objectId: "",
        clientId: clientId,
        oauth2PermissionScopeId: scopeId,
        applicationIdUris: "",
    };
}

function buildSolutionConfig(): ISolutionConfig {
    return {
        subscriptionId: "",
        tenantId: "",
        resourceGroupName: "",
        location: "",
        resourceNameSuffix: "new",
    };
}
