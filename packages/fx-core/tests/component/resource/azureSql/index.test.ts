// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { SqlClient } from "../../../../src/component/resource/azureSql/clients/sql";
import { MockTools, MockUserInteraction, randomAppName } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import sinon from "sinon";
import { AzureSqlResource } from "../../../../src/component/resource/azureSql";
import {
  ContextV3,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
} from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../../../src/component/constants";
import { Constants } from "../../../../src/component/resource/azureSql/constants";
import { newEnvInfoV3 } from "../../../../src/core/environment";
import path from "path";
import * as os from "os";
import faker from "faker";
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
import axios from "axios";
import { TokenInfo, UserType } from "../../../../src/component/resource/azureSql/utils/common";
import * as Common from "../../../../src/component/resource/azureSql/utils/common";
import { AccessToken, GetTokenOptions, TokenCredential } from "@azure/core-auth";
import { PagedAsyncIterableIterator } from "@azure/core-paging";
import { Exception } from "handlebars";

chai.use(chaiAsPromised);

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

describe("Azure-SQL Component", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  const component = new AzureSqlResource();
  const appName = `unittest${randomAppName()}`;
  const projectPath = path.join(os.homedir(), "TeamsApps", appName);
  const inputs: InputsWithProjectPath = {
    projectPath: projectPath,
    platform: Platform.VSCode,
    "app-name": appName,
  };
  let context: ContextV3;
  setTools(tools);

  beforeEach(async () => {
    context = createContextV3();
    context.envInfo = newEnvInfoV3();
    sandbox.stub(SqlClient, "initToken").resolves("mock token");

    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    const mockSqlManagementClient = new SqlManagementClient(new MyTokenCredential(), "id");
    mockSqlManagementClient.firewallRules = mockFirewallRules as any;
    mockSqlManagementClient.serverAzureADAdministrators = mockServerAzureADAdministrators as any;
    mockSqlManagementClient.servers = mockServers as any;
    sandbox.stub(azureSql, "SqlManagementClient").returns(mockSqlManagementClient);
    sandbox.stub(SqlClient.prototype, "addDatabaseUser").resolves();
    sandbox.stub(axios, "get").resolves({ data: "1.1.1.1" });
    const mockInfo: TokenInfo = {
      name: faker.random.word(),
      objectId: faker.random.word(),
      userType: UserType.User,
    };
    sandbox.stub(Common, "parseToken").returns(mockInfo);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("configure happy path", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId:
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/mock-rg/providers/Microsoft.Sql/servers/mock",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
    };
    context.envInfo!.state[ComponentNames.Identity] = {
      [Constants.identityName]: "mock-identity",
    };
    const res = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("configure with skipping add user happy path", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId:
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/mock-rg/providers/Microsoft.Sql/servers/mock",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
    };
    context.envInfo!.state[ComponentNames.Identity] = {
      [Constants.identityName]: "mock-identity",
    };
    context.envInfo!.config["skipAddingSqlUser"] = true;
    const res = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("configure load subscription id error", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return {
        async getToken(
          scopes: string | string[],
          options?: GetTokenOptions | undefined
        ): Promise<AccessToken | null> {
          throw new Exception("");
        },
      };
    };

    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId: "invalidResourceId",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
    };
    context.envInfo!.state[ComponentNames.Identity] = {
      [Constants.identityName]: "mock-identity",
    };
    const res = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal("SqlInvalidConfigError", res.error.name);
    }
  });

  it("configure load resource group error", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId:
        "/subscriptions/00000000-0000-0000-0000-000000000000/invalidResourceGroup/mock-rg/providers/Microsoft.Sql/servers/mock",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
    };
    context.envInfo!.state[ComponentNames.Identity] = {
      [Constants.identityName]: "mock-identity",
    };
    const res = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal("SqlInvalidConfigError", res.error.name);
    }
  });

  it("configure parse login error", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return {
        async getToken(
          scopes: string | string[],
          options?: GetTokenOptions | undefined
        ): Promise<AccessToken | null> {
          throw new Exception("");
        },
      };
    };
    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId:
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/mock-rg/providers/Microsoft.Sql/servers/mock",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
    };
    context.envInfo!.state[ComponentNames.Identity] = {
      [Constants.identityName]: "mock-identity",
    };
    const res = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isErr());
    if (res.isErr()) {
      chai.assert.equal("SqlUserInfoError", res.error.name);
    }
  });

  it("provision happy path", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    sandbox
      .stub(MockUserInteraction.prototype, "inputText")
      .resolves(ok({ type: "success", result: "" }));
    const res = await component.provision(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("provision again", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    sandbox
      .stub(MockUserInteraction.prototype, "inputText")
      .resolves(ok({ type: "success", result: "" }));
    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId:
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/mock-rg/providers/Microsoft.Sql/servers/mock",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
      databaseNameInvalid: "invalid",
    };
    const res = await component.provision(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("generateBicep happy path", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    const res = await component.generateBicep(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("provision in debug", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    context.envInfo!.envName = "local";
    const res = await component.provision(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });

  it("configure in debug", async function () {
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return new MyTokenCredential();
    };

    context.envInfo!.envName = "local";
    const res = await component.configure(context as ResourceContextV3, inputs);
    chai.assert.isTrue(res.isOk());
  });
});
