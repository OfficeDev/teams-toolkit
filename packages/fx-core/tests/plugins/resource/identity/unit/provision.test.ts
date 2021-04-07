import "mocha";
import * as chai from "chai";
import { TestHelper } from "../helper";
import { IdentityPlugin } from "../../../../../src/plugins/resource/identity";
import * as dotenv from "dotenv";
import * as chaiAsPromised from "chai-as-promised";
import { PluginContext } from "fx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";
import * as sinon from "sinon";
import { Constants } from "../../../../../src/plugins/resource/identity/constants";

chai.use(chaiAsPromised);

dotenv.config();
const testWithAzure: boolean = process.env.UT_TEST_ON_AZURE ? true : false;

describe("identityPlugin", () => {
    let identityPlugin: IdentityPlugin;
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
        identityPlugin = new IdentityPlugin();
        pluginContext = await TestHelper.pluginContext(credentials);
    });

    afterEach(() => {
        sinon.restore();
    });

    it("provision", async function () {
        // Arrange
        sinon.stub(IdentityPlugin.prototype, "provisionWithArmTemplate").resolves();

        // Act
        const provisionResult = await identityPlugin.provision(pluginContext);

        // Assert
        chai.assert.isTrue(provisionResult.isOk());
        chai.assert.strictEqual(
            pluginContext.config.get(Constants.identity),
            identityPlugin.config.identity,
        );
    });

    it("provision with Azure", async function () {
        if (testWithAzure) {
            // Act
            const provisionResult = await identityPlugin.provision(pluginContext);

            // Assert
            chai.assert.isTrue(provisionResult.isOk());
            chai.assert.strictEqual(
                pluginContext.config.get(Constants.identity),
                identityPlugin.config.identity,
            );
        } else {
            this.skip();
        }
    });
});