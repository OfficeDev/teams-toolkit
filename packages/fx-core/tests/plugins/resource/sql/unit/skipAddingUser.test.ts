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
import { FirewallRules, ServerAzureADAdministrators } from "@azure/arm-sql";

chai.use(chaiAsPromised);

dotenv.config();

describe("skipAddingUser", () => {
  let sqlPlugin: SqlPlugin;
  let pluginContext: PluginContext;
  let credentials: msRestNodeAuth.TokenCredentialsBase;

  before(async () => {
    credentials = new msRestNodeAuth.ApplicationTokenCredentials(
      faker.random.uuid(),
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
    pluginContext.config.set(Constants.skipAddingUser, true);
    // Act
    preProvisionResult = await sqlPlugin.preProvision(pluginContext);

    // Assert
    chai.assert.isTrue(preProvisionResult.isOk());
    chai.assert.isTrue(sqlPlugin.sqlImpl.config.skipAddingUser);

    // set config false
    pluginContext.config.set(Constants.skipAddingUser, false);
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
    // Act
    const postProvisionResult = await sqlPlugin.postProvision(pluginContext);

    // Assert
    chai.assert.isTrue(postProvisionResult.isOk());
  });
});
