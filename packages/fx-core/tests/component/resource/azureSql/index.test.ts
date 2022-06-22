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
  FunctionAction,
  InputsWithProjectPath,
  ok,
  Platform,
} from "@microsoft/teamsfx-api";
import { ComponentNames } from "../../../../src/component/constants";
import { Constants } from "../../../../src/component/resource/azureSql/constants";
import { newEnvInfoV3 } from "../../../../src";
import path from "path";
import * as os from "os";
import faker from "faker";
import { TokenCredential } from "@azure/core-http";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { Servers, FirewallRules, ServerAzureADAdministrators } from "@azure/arm-sql";
import axios from "axios";
import { TokenResponse } from "adal-node/lib/adal";
import { TokenInfo, UserType } from "../../../../src/component/resource/azureSql/utils/common";
import * as Common from "../../../../src/component/resource/azureSql/utils/common";

chai.use(chaiAsPromised);

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

    const credentials = new msRestNodeAuth.ApplicationTokenCredentials(
      faker.datatype.uuid(),
      faker.internet.url(),
      faker.internet.password()
    );
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return credentials as unknown as TokenCredential;
    };
    context.tokenProvider!.azureAccountProvider.getAccountCredentialAsync = async () => {
      return credentials as unknown as TokenCredentialsBase;
    };

    sandbox.stub(FirewallRules.prototype, "createOrUpdate").resolves();
    sandbox.stub(FirewallRules.prototype, "deleteMethod").resolves();
    sandbox.stub(ServerAzureADAdministrators.prototype, "listByServer").resolves([]);
    sandbox.stub(ServerAzureADAdministrators.prototype, "createOrUpdate").resolves();
    sandbox
      .stub(msRestNodeAuth.ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
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
    context.envInfo!.state[ComponentNames.AzureSQL] = {
      sqlResourceId:
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/mock-rg/providers/Microsoft.Sql/servers/mock",
      sqlEndpoint: "mock.database.windows.net",
      databaseName: "mock",
    };
    context.envInfo!.state[ComponentNames.Identity] = {
      [Constants.identityName]: "mock-identity",
    };
    const configureAction = await component.configure(context, inputs);
    chai.assert.isTrue(configureAction.isOk());
    const action = configureAction._unsafeUnwrap() as FunctionAction;
    const result = await action.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
  });

  it("provision happy path", async function () {
    sandbox.stub(Servers.prototype, "checkNameAvailability").resolves({ available: true });
    sandbox
      .stub(MockUserInteraction.prototype, "inputText")
      .resolves(ok({ type: "success", result: "" }));
    const provisionAction = await component.provision(context, inputs);
    chai.assert.isTrue(provisionAction.isOk());
    const action = provisionAction._unsafeUnwrap() as FunctionAction;
    const result = await action.execute(context, inputs);
    console.log(result);
    chai.assert.isTrue(result.isOk());
  });

  it("generateBicep happy path", async function () {
    const generateBicepAction = await component.generateBicep(context, inputs);
    chai.assert.isTrue(generateBicepAction.isOk());
    const action = generateBicepAction._unsafeUnwrap() as FunctionAction;
    const result = await action.execute(context, inputs);
    chai.assert.isTrue(result.isOk());
  });
});
