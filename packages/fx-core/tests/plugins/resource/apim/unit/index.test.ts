// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import dotenv from "dotenv";
import { ApimPlugin } from "../../../../../src/plugins/resource/apim/src/index";
import { v4 } from "uuid";
import { skip_if, MockPluginContext } from "./testUtil";
import {
    IAadPluginConfig,
    IApimPluginConfig,
    IFunctionPluginConfig,
    ISolutionConfig,
} from "../../../../../src/plugins/resource/apim/src/model/config";
import { PluginContext } from "teamsfx-api";
import { QuestionConstants } from "../../../../../src/plugins/resource/apim/src/constants";
dotenv.config();
chai.use(chaiAsPromised);
const enableTest: boolean = process.env.OVERALL_TEST ? process.env.OVERALL_TEST === "true" : false;

const testSubscriptionId: string = process.env.UT_SUBSCRIPTION_ID ?? "";
const testResourceGroup: string = process.env.UT_RESOURCE_GROUP ?? "";
const testTenantId: string = process.env.UT_TENANT_ID ?? "";
const testLocation: string = process.env.UT_LOCATION ?? "";
const testServicePrincipalClientId: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_ID ?? "";
const testServicePrincipalClientSecret: string = process.env.UT_SERVICE_PRINCIPAL_CLIENT_SECRET ?? "";
const testScopeObjectId: string = process.env.UT_AAD_SCOPE_OBJECT_ID ?? "";
const testScopeClientId: string = process.env.UT_AAD_SCOPE_CLIENT_ID ?? "";
const testScopeScopeId: string = process.env.UT_AAD_SCOPE_SCOPE_ID ?? "";
const testScopeIdentityUrl: string = process.env.UT_AAD_SCOPE_IDENTITY_URL ?? "";
const testFunctionEndpoint: string = process.env.UT_FUNCTION_ENDPOINT ?? "";

const testCreateSuffix: string = process.env.UT_CREATE_SUFFIX ?? v4().substring(0, 6);

describe("ApimPlugin", () => {
    describe("Happy path", () => {
        const apimPlugin = new ApimPlugin();
        skip_if(!enableTest, "First time create", async () => {
            const ctx = await buildContext("teamsfx-apim-test", testCreateSuffix);

            let result = await apimPlugin.scaffold(ctx);
            chai.assert.isTrue(result.isOk(), "Operation apimPlugin.scaffold should be succeeded.");
            result = await apimPlugin.provision(ctx);
            chai.assert.isTrue(result.isOk(), "Operation apimPlugin.provision should be succeeded.");
            result = await apimPlugin.postProvision(ctx);
            chai.assert.isTrue(result.isOk(), "Operation apimPlugin.postProvision should be succeeded.");
            result = await apimPlugin.deploy(ctx);
            chai.assert.isTrue(result.isOk(), "Operation apimPlugin.deploy should be succeeded.");
        });
    });
});

async function buildContext(resourceName: string, resourceNameSuffix: string): Promise<PluginContext> {
    const aadConfig: IAadPluginConfig = {
        objectId: testScopeObjectId,
        clientId: testScopeClientId,
        oauth2PermissionScopeId: testScopeScopeId,
        applicationIdUris: testScopeIdentityUrl,
    };
    const functionConfig: IFunctionPluginConfig = {
        functionEndpoint: testFunctionEndpoint,
    };
    const apimConfig: IApimPluginConfig = {
        apiDocumentPath: "./test/unit/data/index/openapi.json",
        apiPrefix: "apim-plugin-test",
    };
    const answer = {
        [QuestionConstants.Apim.questionName]: {
            label: QuestionConstants.Apim.createNewApimOption,
        },
        [QuestionConstants.ApiVersion.questionName]: {
            label: QuestionConstants.ApiVersion.createNewApiVersionOption,
        },
        [QuestionConstants.NewApiVersion.questionName]: "v1",
    };
    const ctx = new MockPluginContext(
        resourceName,
        testTenantId,
        testServicePrincipalClientId,
        testServicePrincipalClientSecret,
        buildSolutionConfig(resourceNameSuffix),
        apimConfig,
        aadConfig,
        functionConfig,
        answer
    );
    await ctx.init();
    return ctx;
}

function buildSolutionConfig(resourceNameSuffix: string): ISolutionConfig {
    return {
        subscriptionId: testSubscriptionId,
        resourceNameSuffix: resourceNameSuffix,
        resourceGroupName: testResourceGroup,
        tenantId: testTenantId,
        location: testLocation,
    };
}
