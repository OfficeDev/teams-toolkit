// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";

import { SimpleAuthPlugin } from "../../../../../src/plugins/resource/simpleauth/index";
import { TestHelper } from "../helper";
import { Constants } from "../../../../../src/plugins/resource/simpleauth/constants";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as fs from "fs-extra";
import { WebAppClient } from "../../../../../src/plugins/resource/simpleauth/webAppClient";
import * as faker from "faker";
import * as dotenv from "dotenv";
import { Utils } from "../../../../../src/plugins/resource/simpleauth/utils/common";
import { PluginContext } from "fx-api";

chai.use(chaiAsPromised);

dotenv.config();
const testWithAzure: boolean = process.env.UT_TEST_ON_AZURE ? true : false;

describe("simpleAuthPlugin", () => {
    let simpleAuthPlugin: SimpleAuthPlugin;
    let pluginContext: PluginContext;
    let credentials: msRestNodeAuth.TokenCredentialsBase;

    before(async () => {
        if (testWithAzure) {
            credentials = await msRestNodeAuth.interactiveLogin();
        } else {
            credentials = new msRestNodeAuth.ApplicationTokenCredentials(
                faker.random.uuid(),
                faker.internet.url(),
                faker.internet.password(),
            );
        }
    });

    beforeEach(async () => {
        simpleAuthPlugin = new SimpleAuthPlugin();
        pluginContext = await TestHelper.pluginContext(credentials);
    });

    afterEach(() => {
        sinon.restore();
    });

    it("local debug", async function () {
        // Act
        await simpleAuthPlugin.localDebug(pluginContext);
        await simpleAuthPlugin.postLocalDebug(pluginContext);

        // Assert
        const filePath = pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.filePath) as string;
        chai.assert.isOk(filePath);
        chai.assert.isTrue(await fs.pathExists(filePath));
        const expectedEnvironmentVariableParams =
            "CLIENT_ID=\"mock-local-clientId\" CLIENT_SECRET=\"mock-local-clientSecret\" OAUTH_TOKEN_ENDPOINT=\"https://login.microsoftonline.com/mock-teamsAppTenantId/oauth2/v2.0/token\" IDENTIFIER_URI=\"mock-local-applicationIdUris\" ALLOWED_APP_IDS=\"mock-teamsMobileDesktopAppId;mock-teamsWebAppId\"";
        chai.assert.strictEqual(
            pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.environmentVariableParams),
            expectedEnvironmentVariableParams,
        );
    });

    it("provision", async function () {
        // Arrange
        const endpoint = faker.internet.url();
        sinon.stub(WebAppClient.prototype, "createWebApp").resolves(endpoint);
        sinon.stub(WebAppClient.prototype, "zipDeploy").resolves();
        sinon.stub(WebAppClient.prototype, "configWebApp").resolves();

        // Act
        const provisionResult = await simpleAuthPlugin.provision(pluginContext);
        const postProvisionResult = await simpleAuthPlugin.postProvision(pluginContext);

        // Assert
        chai.assert.isTrue(provisionResult.isOk());
        chai.assert.strictEqual(
            pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.endpoint),
            endpoint,
        );
        chai.assert.isTrue(postProvisionResult.isOk());
    });

    it("provision with Azure", async function () {
        if (testWithAzure) {
            // Act
            const provisionResult = await simpleAuthPlugin.provision(pluginContext);
            const postProvisionResult = await simpleAuthPlugin.postProvision(pluginContext);

            // Assert
            chai.assert.isTrue(provisionResult.isOk());
            const resourceNameSuffix = pluginContext.configOfOtherPlugins
                .get(Constants.SolutionPlugin.id)
                ?.get(Constants.SolutionPlugin.configKeys.resourceNameSuffix) as string;
            const webAppName = Utils.generateResourceName(pluginContext.app.name.short, resourceNameSuffix);
            chai.assert.strictEqual(
                pluginContext.config.get(Constants.SimpleAuthPlugin.configKeys.endpoint),
                `https://${webAppName}.azurewebsites.net`,
            );
            chai.assert.isTrue(postProvisionResult.isOk());
        } else {
            this.skip();
        }
    });
});
