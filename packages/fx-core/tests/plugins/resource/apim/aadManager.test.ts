// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import axios from "axios";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import dotenv from "dotenv";
import { AadManager } from "../../../../src/plugins/resource/apim/manager/aadManager";
import { v4 } from "uuid";
import { AadHelper, MockGraphTokenProvider, it_if, after_if, before_if, EnvConfig } from "./testUtil";
import { InvalidAadObjectId } from "../../../../src/plugins/resource/apim/error";
import { IRequiredResourceAccess } from "../../../../src/plugins/resource/apim/model/aadResponse";
import { AadService } from "../../../../src/plugins/resource/apim/service/aadService";
import { IAadPluginConfig, IApimPluginConfig } from "../../../../src/plugins/resource/apim/model/config";
import { AadDefaultValues } from "../../../../src/plugins/resource/apim/constants";
import { Lazy } from "../../../../src/plugins/resource/apim/util/lazy";
dotenv.config();
chai.use(chaiAsPromised);

const UT_SUFFIX = v4().substring(0, 6);
const UT_APP_NAME = `fx-apim-local-unit-test-aad-manager-${UT_SUFFIX}`;

describe("AadManager", () => {
    let aadManager: AadManager;
    let aadService: AadService;
    let aadHelper: AadHelper;

    before(async () => {
        const result = await buildService(EnvConfig.enableTest);
        aadService = result.aadService;
        aadManager = result.aadManager;
        aadHelper = result.aadHelper;
    });

    after_if(EnvConfig.enableTest, async () => {
        await aadHelper.deleteAadByName(UT_APP_NAME);
        await aadHelper.deleteAadByName(`${UT_APP_NAME}-client`);
    });

    describe("#provision()", () => {
        let testObjectId = EnvConfig.defaultGuid;
        let testSecret = "";
        let testClientId = EnvConfig.defaultGuid;

        before_if(EnvConfig.enableTest, async () => {
            const aadInfo = await aadService.createAad(UT_APP_NAME);
            testObjectId = aadInfo.id ?? "";
            testClientId = aadInfo.appId ?? "";
            const secretInfo = await aadService.addSecret(testObjectId, "test secret");
            testSecret = secretInfo.secretText ?? "";
        });

        it_if(EnvConfig.enableTest, "Create a new AAD", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig();

            // Act
            await aadManager.provision(apimPluginConfig, UT_APP_NAME);

            // Assert
            chai.assert.isNotEmpty(apimPluginConfig.apimClientAADObjectId);
            chai.assert.isNotEmpty(apimPluginConfig.apimClientAADClientId);
            chai.assert.isNotEmpty(apimPluginConfig.apimClientAADClientSecret);

            const queryResult = await aadService.getAad(apimPluginConfig.apimClientAADObjectId ?? "");
            chai.assert.isNotEmpty(queryResult);
        });

        it_if(EnvConfig.enableTest, "Use an existing AAD failed because of error object id", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig(EnvConfig.defaultGuid);

            // Act & Assert
            await chai
                .expect(aadManager.provision(apimPluginConfig, UT_APP_NAME))
                .to.be.rejectedWith(InvalidAadObjectId.message((EnvConfig.defaultGuid)));
        });

        it_if(EnvConfig.enableTest, "Use an existing AAD, using existing secret", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig(testObjectId, testSecret);

            // Act
            await aadManager.provision(apimPluginConfig, UT_APP_NAME);

            // Assert
            chai.assert.equal(testObjectId, apimPluginConfig.apimClientAADObjectId);
            chai.assert.equal(testClientId, apimPluginConfig.apimClientAADClientId);
            chai.assert.equal(testSecret, apimPluginConfig.apimClientAADClientSecret);
        });

        it_if(EnvConfig.enableTest, "Use an existing AAD, create new secret", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig(testObjectId);

            // Act
            await aadManager.provision(apimPluginConfig, UT_APP_NAME);

            // Assert
            chai.assert.equal(testObjectId, apimPluginConfig.apimClientAADObjectId);
            chai.assert.equal(testClientId, apimPluginConfig.apimClientAADClientId);
            chai.assert.notEqual(testSecret, apimPluginConfig.apimClientAADClientSecret);
        });
    });

    describe("#postProvision()", () => {
        let testObjectId = EnvConfig.defaultGuid;
        let testScopeClientId = EnvConfig.defaultGuid;
        const testNewScopeId = v4();
        const testExistingScopeId = v4();

        before_if(EnvConfig.enableTest, async () => {
            const clientAadInfo = await aadService.createAad(UT_APP_NAME);
            testScopeClientId = clientAadInfo.appId ?? "";

            await updateAadScope(aadService, clientAadInfo.id ?? "", [testNewScopeId, testExistingScopeId]);

            const aadInfo = await aadService.createAad(UT_APP_NAME);
            testObjectId = aadInfo.id ?? "";
            aadService.updateAad(testObjectId, { requiredResourceAccess: [{ resourceAppId: testScopeClientId, resourceAccess: [{ id: testExistingScopeId, type: "Scope" }] }] });
        });

        it_if(EnvConfig.enableTest, "Add a existing scope and add a new redirect url", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig(testObjectId);
            const aadPluginConfig = buildAadPluginConfig(testScopeClientId, testExistingScopeId);
            const redirectUris = [`https://testredirect/${v4()}`];

            // Act
            await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

            // Assert
            const updatedAad = await aadService.getAad(apimPluginConfig.apimClientAADObjectId!);
            chai.assert.isTrue(updatedAad?.web?.implicitGrantSettings?.enableIdTokenIssuance);
            chai.assert.exists(updatedAad?.web?.redirectUris);
            chai.assert.oneOf(redirectUris[0], updatedAad?.web?.redirectUris ?? []);
            const foundResourceAccess = updatedAad?.requiredResourceAccess?.find((x) => x.resourceAppId === testScopeClientId);
            chai.assert.exists(foundResourceAccess);
            chai.assert.includeDeepMembers(foundResourceAccess?.resourceAccess ?? [], [{ id: testExistingScopeId, type: "Scope" }]);
        });

        it_if(EnvConfig.enableTest, "Add a new scope and existing redirect url", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig(testObjectId);
            const redirectUris = [`https://testredirect`, `https://testredirect/${v4()}`];
            const aadPluginConfig = buildAadPluginConfig(testScopeClientId, testNewScopeId);

            // Act
            await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

            // Assert
            const updatedAad = await aadService.getAad(testObjectId);
            chai.assert.isTrue(updatedAad?.web?.implicitGrantSettings?.enableIdTokenIssuance);
            chai.assert.exists(updatedAad?.web?.redirectUris);
            chai.assert.oneOf(redirectUris[0], updatedAad?.web?.redirectUris ?? []);
            chai.assert.oneOf(redirectUris[1], updatedAad?.web?.redirectUris ?? []);
            const foundResourceAccess = updatedAad?.requiredResourceAccess?.find((x) => x.resourceAppId === testScopeClientId);
            chai.assert.exists(foundResourceAccess);
            chai.assert.includeDeepMembers(foundResourceAccess?.resourceAccess ?? [], [{ id: testNewScopeId, type: "Scope" }]);
        });

        it_if(EnvConfig.enableTest, "Add existing scope and existing redirect url", async () => {
            // Arrange
            const apimPluginConfig = buildApimPluginConfig(testObjectId);
            const redirectUris = [`https://testredirect`];
            const aadPluginConfig = buildAadPluginConfig(testScopeClientId, testExistingScopeId);

            // Act
            await aadManager.postProvision(apimPluginConfig, aadPluginConfig, redirectUris);

            // Assert
            const updatedAad = await aadService.getAad(testObjectId);
            chai.assert.isTrue(updatedAad?.web?.implicitGrantSettings?.enableIdTokenIssuance);
            chai.assert.exists(updatedAad?.web?.redirectUris);
            chai.assert.oneOf(redirectUris[0], updatedAad?.web?.redirectUris ?? []);
            const foundResourceAccess = updatedAad?.requiredResourceAccess?.find((x) => x.resourceAppId === testScopeClientId);
            chai.assert.exists(foundResourceAccess);
            chai.assert.includeDeepMembers(foundResourceAccess?.resourceAccess ?? [], [{ id: testExistingScopeId, type: "Scope" }]);
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
                // Arrange
                sinon.stub(aadService, "getAad").callsFake((objectId: string) => Promise.resolve({ requiredResourceAccess: input.source }));
                const updateAadStub = sinon.stub(aadService, "updateAad").callsFake((objectId, data) => Promise.resolve());
                const aadPluginConfig = buildAadPluginConfig("0", "0");
                const apimPluginConfig = buildApimPluginConfig(EnvConfig.defaultGuid);

                // Act
                await aadManager.postProvision(apimPluginConfig, aadPluginConfig, []);

                // Assert
                sinon.assert.calledWith(updateAadStub, EnvConfig.defaultGuid, sinon.match({ requiredResourceAccess: input.expected }));
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
                // Arrange
                sinon.stub(aadService, "getAad").callsFake((objectId: string) => Promise.resolve({ web: { redirectUris: input.source } }));
                const updateAadStub = sinon.stub(aadService, "updateAad").callsFake((objectId, data) => Promise.resolve());
                const aadPluginConfig = buildAadPluginConfig("", "");
                const apimPluginConfig = buildApimPluginConfig(EnvConfig.defaultGuid);

                // Act
                await aadManager.postProvision(apimPluginConfig, aadPluginConfig, input.added);

                // Assert
                sinon.assert.calledWith(updateAadStub, EnvConfig.defaultGuid, sinon.match({ web: { redirectUris: input.expected } }));
            });
        });
    });
});

async function buildService(enableLogin: boolean): Promise<{ aadService: AadService, aadManager: AadManager, aadHelper: AadHelper }> {
    const mockGraphTokenProvider = new MockGraphTokenProvider(EnvConfig.tenantId, EnvConfig.servicePrincipalClientId, EnvConfig.servicePrincipalClientSecret);
    const graphToken = enableLogin ? await mockGraphTokenProvider.getAccessToken() : "";
    const axiosInstance = axios.create({
        baseURL: AadDefaultValues.graphApiBasePath,
        headers: {
            authorization: `Bearer ${graphToken}`,
            "content-type": "application/json",
        },
    });
    const aadService = new AadService(axiosInstance);
    const lazyAadService = new Lazy<AadService>(() => Promise.resolve(aadService));
    const aadManager = new AadManager(lazyAadService);
    const aadHelper = new AadHelper(axiosInstance);
    return { aadService: aadService, aadManager: aadManager, aadHelper: aadHelper };
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

async function updateAadScope(aadService: AadService, objectId: string, scopeIds: string[]) {
    await aadService.updateAad(objectId, {
        api: {
            oauth2PermissionScopes: scopeIds.map(scope => {
                return {
                    adminConsentDescription: "Test consent description",
                    adminConsentDisplayName: "Test display name",
                    id: scope,
                    isEnabled: true,
                    type: "User",
                    userConsentDescription: "Test consent description",
                    userConsentDisplayName: "Test display name",
                    value: `access_as_user_${scope.substring(0, 6)}`,
                };
            }),
        }
    });
}