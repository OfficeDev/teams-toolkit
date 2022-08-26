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
import { sqlUserNameValidator } from "../../../../../src/plugins/resource/sql/utils/checkInput";
import axios from "axios";
import {
  SqlManagementClient,
  FirewallRule,
  FirewallRulesCreateOrUpdateOptionalParams,
  FirewallRulesCreateOrUpdateResponse,
  FirewallRulesDeleteOptionalParams,
  ServerAzureADAdministratorsListByServerOptionalParams,
  ServerAzureADAdministrator,
  AdministratorName,
  ServerAzureADAdministratorsCreateOrUpdateOptionalParams,
  ServerAzureADAdministratorsCreateOrUpdateResponse,
  CheckNameAvailabilityRequest,
  ServersCheckNameAvailabilityOptionalParams,
  ServersCheckNameAvailabilityResponse,
} from "@azure/arm-sql";
import * as azureSql from "@azure/arm-sql";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import { PagedAsyncIterableIterator } from "@azure/core-paging";

chai.use(chaiAsPromised);

dotenv.config();

class MyTokenCredential implements TokenCredential {
  async getToken(
    scopes: string | string[],
    options?: GetTokenOptions | undefined
  ): Promise<AccessToken | null> {
    return {
      token: "a.eyJ1c2VySWQiOiJ0ZXN0QHRlc3QuY29tIn0=.c",
      expiresOnTimestamp: 1234,
    };
  }
}

const mockFirewallRules = {
  createOrUpdate: async function (
    resourceGroupName: string,
    serverName: string,
    firewallRuleName: string,
    parameters: FirewallRule,
    options?: FirewallRulesCreateOrUpdateOptionalParams
  ): Promise<FirewallRulesCreateOrUpdateResponse> {
    return {};
  },
  delete: async function (
    resourceGroupName: string,
    serverName: string,
    firewallRuleName: string,
    options?: FirewallRulesDeleteOptionalParams
  ): Promise<void> {},
};

const mockServerAzureADAdministrators = {
  listByServer: function (
    resourceGroupName: string,
    serverName: string,
    options?: ServerAzureADAdministratorsListByServerOptionalParams
  ): PagedAsyncIterableIterator<ServerAzureADAdministrator> {
    return {
      next() {
        throw new Error("Function not implemented.");
      },
      [Symbol.asyncIterator]() {
        throw new Error("Function not implemented.");
      },
      byPage: () => {
        return generator() as any;
      },
    };

    function* generator() {
      yield [];
    }
  },
  beginCreateOrUpdateAndWait: async function (
    resourceGroupName: string,
    serverName: string,
    administratorName: AdministratorName,
    parameters: ServerAzureADAdministrator,
    options?: ServerAzureADAdministratorsCreateOrUpdateOptionalParams
  ): Promise<ServerAzureADAdministratorsCreateOrUpdateResponse> {
    return {};
  },
};

const mockServers = {
  checkNameAvailability: async function (
    parameters: CheckNameAvailabilityRequest,
    options?: ServersCheckNameAvailabilityOptionalParams
  ): Promise<ServersCheckNameAvailabilityResponse> {
    return { available: true };
  },
};

describe("sqlPlugin", () => {
  let sqlPlugin: SqlPlugin;
  let pluginContext: PluginContext;

  before(async () => {});

  beforeEach(async () => {
    sqlPlugin = new SqlPlugin();
    pluginContext = await TestHelper.pluginContext();
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
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
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
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
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

  it("postProvision", async function () {
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.firewallRules = mockFirewallRules as any;
    mockSqlManagementClient.serverAzureADAdministrators = mockServerAzureADAdministrators as any;
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    sinon
      .stub(ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    sinon.stub(SqlClient.prototype, "addDatabaseUser").resolves();
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });

    TestHelper.mockArmOutput(pluginContext);

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });

  it("postProvision with multiple database", async function () {
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.firewallRules = mockFirewallRules as any;
    mockSqlManagementClient.serverAzureADAdministrators = mockServerAzureADAdministrators as any;
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    sinon
      .stub(ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    const addUserStub = sinon.stub(SqlClient.prototype, "addDatabaseUser").resolves();
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });
    TestHelper.mockArmOutput(pluginContext);
    pluginContext.config.set("databaseName_000000", "databaseName_000000");
    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
    chai.assert.isTrue(addUserStub.calledTwice);
  });

  it("postProvision with aadAdminType ServicePrincipal", async function () {
    sqlPlugin.sqlImpl.config.aadAdminType = UserType.ServicePrincipal;
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.firewallRules = mockFirewallRules as any;
    mockSqlManagementClient.serverAzureADAdministrators = mockServerAzureADAdministrators as any;
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });

    TestHelper.mockArmOutput(pluginContext);

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });

  it("postProvision with axios error", async function () {
    sqlPlugin.sqlImpl.config.aadAdminType = UserType.ServicePrincipal;
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.firewallRules = mockFirewallRules as any;
    mockSqlManagementClient.serverAzureADAdministrators = mockServerAzureADAdministrators as any;
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    const errorMessage = "getaddrinfo ENOTFOUND";
    sinon.stub(axios, "get").throws(new Error(errorMessage));

    TestHelper.mockArmOutput(pluginContext);

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isErr());
    const err = postProvisionResult._unsafeUnwrapErr();
    chai.assert.isTrue(err.message.includes(errorMessage));
  });

  it("check invalid username", async function () {
    const invalidNames = ["admin", "Admin", "root", "Root", "dbmanager", "DbManager"];
    invalidNames.forEach((name) => {
      const res = sqlUserNameValidator(name);
      chai.assert.isNotEmpty(res);
    });
  });
});
