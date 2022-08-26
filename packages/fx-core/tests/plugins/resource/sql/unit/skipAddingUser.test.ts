import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "../helper";
import { SqlPlugin } from "../../../../../src/plugins/resource/sql";
import * as dotenv from "dotenv";
import { Platform, PluginContext } from "@microsoft/teamsfx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";
import * as sinon from "sinon";
import { ApplicationTokenCredentials } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node/lib/adal";
import { Constants } from "../../../../../src/plugins/resource/sql/constants";
import * as commonUtils from "../../../../../src/plugins/resource/sql/utils/commonUtils";
import { FirewallRules, ServerAzureADAdministrators, Servers } from "@azure/arm-sql";
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
    return { available: false };
  },
};

describe("skipAddingUser", () => {
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

  it("preProvision", async function () {
    // Arrange
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.servers = mockServers as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    sinon
      .stub(ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    const mockInfo: commonUtils.TokenInfo = {
      name: faker.random.word(),
      objectId: faker.random.word(),
      userType: commonUtils.UserType.User,
    };
    sinon.stub(commonUtils, "parseToken").returns(mockInfo);

    pluginContext.config.set(Constants.sqlEndpoint, "test-sql.database.windows.net");
    pluginContext.config.set(
      Constants.sqlResourceId,
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Sql/servers/test-sql"
    );

    // Act
    let preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isOk());
    chai.assert.isFalse(sqlPlugin.sqlImpl.config.skipAddingUser);

    // set no identity credential
    let i = 0;
    pluginContext.azureAccountProvider!.getIdentityCredentialAsync = async () => {
      if (i++ == 1) {
        return undefined;
      } else {
        return new MyTokenCredential();
      }
    };
    // Act
    preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isOk());
    chai.assert.isTrue(sqlPlugin.sqlImpl.config.skipAddingUser);

    // set config true
    pluginContext.envInfo.config[Constants.skipAddingSqlUser] = true;
    // Act
    preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isOk());
    chai.assert.isTrue(sqlPlugin.sqlImpl.config.skipAddingUser);

    // set config false
    pluginContext.envInfo.config[Constants.skipAddingSqlUser] = false;

    // Act
    preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isOk());
    chai.assert.isFalse(sqlPlugin.sqlImpl.config.skipAddingUser);
  });

  it("postProvision with skipAddingUser", async function () {
    sqlPlugin.sqlImpl.config.skipAddingUser = true;
    sqlPlugin.sqlImpl.config.sqlServer = "test-sql";

    // Arrange
    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.firewallRules = mockFirewallRules as any;
    mockSqlManagementClient.serverAzureADAdministrators = mockServerAzureADAdministrators as any;
    sinon.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });

    TestHelper.mockArmOutput(pluginContext);

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });
});
