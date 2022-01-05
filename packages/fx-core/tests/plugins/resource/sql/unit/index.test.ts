import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "../helper";
import { SqlPlugin } from "../../../../../src/plugins/resource/sql";
import * as dotenv from "dotenv";
import { Platform, PluginContext, Stage } from "@microsoft/teamsfx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";
import * as sinon from "sinon";
import { Databases, Servers, FirewallRules, ServerAzureADAdministrators } from "@azure/arm-sql";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node/lib/adal";
import { Providers } from "@azure/arm-resources";
import { SqlClient } from "../../../../../src/plugins/resource/sql/sqlClient";
import { Constants } from "../../../../../src/plugins/resource/sql/constants";
import * as commonUtils from "../../../../../src/plugins/resource/sql/utils/commonUtils";
import { UserType } from "../../../../../src/plugins/resource/sql/utils/commonUtils";
import { ManagementClient } from "../../../../../src/plugins/resource/sql/managementClient";
import { SqlPluginImpl } from "../../../../../src/plugins/resource/sql/plugin";
import { isArmSupportEnabled } from "../../../../../src";
import { sqlUserNameValidator } from "../../../../../src/plugins/resource/sql/utils/checkInput";
import axios from "axios";

chai.use(chaiAsPromised);

dotenv.config();

describe("sqlPlugin", () => {
  let sqlPlugin: SqlPlugin;
  let pluginContext: PluginContext;
  let credentials: msRestNodeAuth.TokenCredentialsBase;

  before(async () => {
    credentials = new msRestNodeAuth.ApplicationTokenCredentials(
      faker.datatype.uuid(),
      faker.internet.url(),
      faker.internet.password()
    );
  });

  beforeEach(async () => {
    sqlPlugin = new SqlPlugin();
    pluginContext = await TestHelper.pluginContext(credentials);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("getQuestions", async function () {
    // Act
    const getQuestionResult = await sqlPlugin.getQuestions(Stage.provision, pluginContext);

    // Assert
    chai.assert.isTrue(getQuestionResult.isOk());
  });

  it("getQuestions in cli help", async function () {
    // Arrange
    pluginContext.answers === { platform: Platform.CLI_HELP };
    // Act
    const getQuestionResult = await sqlPlugin.getQuestions(Stage.provision, pluginContext);

    // Assert
    chai.assert.isTrue(getQuestionResult.isOk());
  });

  it("preProvision", async function () {
    // Arrange
    sinon.stub(Servers.prototype, "checkNameAvailability").resolves({ available: true });
    sinon.stub(SqlPluginImpl.prototype, "askInputs").resolves();
    sinon
      .stub(ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    const mockInfo: commonUtils.TokenInfo = {
      name: faker.random.word(),
      objectId: faker.random.word(),
      userType: commonUtils.UserType.User,
    };
    sinon.stub(commonUtils, "parseToken").returns(mockInfo);
    pluginContext.answers = { platform: Platform.VSCode };
    pluginContext.answers[Constants.questionKey.adminName] = "test-admin";
    pluginContext.answers[Constants.questionKey.adminPassword] = "test-password";

    // Act
    const preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isOk());
  });

  it("preProvision failed for no answer", async function () {
    // Arrange
    sinon.stub(Servers.prototype, "checkNameAvailability").resolves({ available: true });
    sinon.stub(SqlPluginImpl.prototype, "askInputs").resolves();
    sinon
      .stub(ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    pluginContext.answers = { platform: Platform.VSCode };

    // Act
    const preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isErr());
  });

  it("provision", async function () {
    if (isArmSupportEnabled()) {
      // plugin provision is skipped with ARM
      return;
    }
    sqlPlugin.sqlImpl.config.existSql = false;
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    sinon.stub(Servers.prototype, "createOrUpdate").resolves();
    sinon.stub(Databases.prototype, "listByServer").resolves();
    sinon.stub(Databases.prototype, "createOrUpdate").resolves();
    sinon.stub(Providers.prototype, "register").resolves();
    sinon.stub(ManagementClient.prototype, "delay").resolves();

    // Act
    const provisionResult = await sqlPlugin.provision(pluginContext);

    // Assert
    chai.assert.isTrue(provisionResult.isOk());
  });

  it("postProvision", async function () {
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    sinon.stub(FirewallRules.prototype, "createOrUpdate").resolves();
    sinon.stub(FirewallRules.prototype, "deleteMethod").resolves();
    sinon.stub(ServerAzureADAdministrators.prototype, "listByServer").resolves([]);
    sinon.stub(ServerAzureADAdministrators.prototype, "createOrUpdate").resolves();
    sinon
      .stub(ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    sinon.stub(SqlClient.prototype, "addDatabaseUser").resolves();
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });

    if (isArmSupportEnabled()) {
      TestHelper.mockArmOutput(pluginContext);
    }

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });

  it("postProvision with aadAdminType ServicePrincipal", async function () {
    sqlPlugin.sqlImpl.config.aadAdminType = UserType.ServicePrincipal;
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    sinon.stub(FirewallRules.prototype, "createOrUpdate").resolves();
    sinon.stub(FirewallRules.prototype, "deleteMethod").resolves();
    sinon.stub(ServerAzureADAdministrators.prototype, "listByServer").resolves([]);
    sinon.stub(ServerAzureADAdministrators.prototype, "createOrUpdate").resolves();
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });

    if (isArmSupportEnabled()) {
      TestHelper.mockArmOutput(pluginContext);
    }

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });

  it("check invalid username", async function () {
    const invalidNames = ["admin", "Admin", "root", "Root", "dbmanager", "DbManager"];
    invalidNames.forEach((name) => {
      const res = sqlUserNameValidator(name);
      chai.assert.isNotEmpty(res);
    });
  });
});
