import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "../helper";
import { SqlPlugin } from "../../../../../src/plugins/resource/sql";
import * as dotenv from "dotenv";
import { ConfigMap, PluginContext, Stage } from "teamsfx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";
import * as sinon from "sinon";
import { Databases, Servers, FirewallRules, ServerAzureADAdministrators } from "@azure/arm-sql";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node/lib/adal";
import { SqlClient } from "../../../../../src/plugins/resource/sql/sqlClient";
import { Constants } from "../../../../../src/plugins/resource/sql/constants";
import * as commonUtils from "../../../../../src/plugins/resource/sql/utils/commonUtils";

chai.use(chaiAsPromised);

dotenv.config();
const testWithAzure: boolean = process.env.UT_TEST_ON_AZURE ? true : false;

describe("sqlPlugin", () => {
    let sqlPlugin: SqlPlugin;
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
        sqlPlugin = new SqlPlugin();
        pluginContext = await TestHelper.pluginContext(credentials);
    });

    afterEach(() => {
        sinon.restore();
    });

    it("getQuestions", async function () {
        // Arrange
        sinon.stub(Servers.prototype, "checkNameAvailability").resolves({ available: true });

        // Act
        const getQuestionResult = await sqlPlugin.getQuestions(Stage.provision, pluginContext);

        // Assert
        chai.assert.isTrue(getQuestionResult.isOk());
    });

    it("preProvision", async function () {
        // Arrange
        sinon.stub(ApplicationTokenCredentials.prototype, "getToken").resolves({ accessToken: faker.random.word() } as TokenResponse);
        const mockInfo: commonUtils.TokenInfo = {
            name: faker.random.word(),
            objectId: faker.random.word(),
            userType: commonUtils.UserType.User
        };
        sinon.stub(commonUtils, "parseToken").returns(mockInfo);
        pluginContext.answers = new ConfigMap([
            [Constants.questionKey.adminName, "test-admin"],
            [Constants.questionKey.adminPassword, "test-password"],
        ]);

        // Act
        const preProvisionResult = await sqlPlugin.preProvision(pluginContext);

        // Assert
        chai.assert.isTrue(preProvisionResult.isOk());
    });


    it("provision", async function () {
        sqlPlugin.sqlImpl.config.existSql = false;
        sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

        // Arrange
        sinon.stub(Servers.prototype, "createOrUpdate").resolves();
        sinon.stub(Databases.prototype, "listByServer").resolves();
        sinon.stub(Databases.prototype, "createOrUpdate").resolves();

        // Act
        const provisionResult = await sqlPlugin.provision(pluginContext);

        // Assert
        chai.assert.isTrue(provisionResult.isOk());
    });

    it("postProvision", async function () {
        sqlPlugin.sqlImpl.config.existSql = false;
        sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

        // Arrange
        sinon.stub(FirewallRules.prototype, "createOrUpdate").resolves();
        sinon.stub(FirewallRules.prototype, "deleteMethod").resolves();
        sinon.stub(ServerAzureADAdministrators.prototype, "listByServer").resolves([]);
        sinon.stub(ServerAzureADAdministrators.prototype, "createOrUpdate").resolves();
        sinon.stub(SqlClient.prototype, "initToken").resolves();
        sinon.stub(SqlClient.prototype, "existUser").resolves(false);
        sinon.stub(SqlClient.prototype, "addDatabaseUser").resolves();


        // Act
        const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

        // Assert
        chai.assert.isTrue(postProvisionResult.isOk());
    });
});