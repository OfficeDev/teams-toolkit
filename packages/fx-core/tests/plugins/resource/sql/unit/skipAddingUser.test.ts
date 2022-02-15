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

chai.use(chaiAsPromised);

dotenv.config();

describe("skipAddingUser", () => {
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

  it("preProvision", async function () {
    // Arrange
    sinon.stub(Servers.prototype, "checkNameAvailability").resolves({ available: false });
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
    pluginContext.azureAccountProvider!.getIdentityCredentialAsync = async () => {
      return undefined;
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
    sinon.stub(FirewallRules.prototype, "createOrUpdate").resolves();
    sinon.stub(FirewallRules.prototype, "deleteMethod").resolves();
    sinon.stub(ServerAzureADAdministrators.prototype, "listByServer").resolves([]);
    sinon.stub(ServerAzureADAdministrators.prototype, "createOrUpdate").resolves();
    sinon.stub(axios, "get").resolves({ data: "1.1.1.1" });

    TestHelper.mockArmOutput(pluginContext);

    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });
});
