import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "../helper";
import { SqlPlugin } from "../../../../../src/plugins/resource/sql";
import * as dotenv from "dotenv";
import { PluginContext, UserError } from "@microsoft/teamsfx-api";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import * as faker from "faker";
import * as sinon from "sinon";
import { SqlClient } from "../../../../../src/plugins/resource/sql/sqlClient";
import { ErrorMessage } from "../../../../../src/plugins/resource/sql/errors";
import { TokenResponse } from "adal-node/lib/adal";

chai.use(chaiAsPromised);

dotenv.config();

describe("sqlClient", () => {
  let sqlPlugin: SqlPlugin;
  let pluginContext: PluginContext;
  let credentials: msRestNodeAuth.TokenCredentialsBase;
  let client: SqlClient;

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
    sinon
      .stub(msRestNodeAuth.ApplicationTokenCredentials.prototype, "getToken")
      .resolves({ accessToken: faker.random.word() } as TokenResponse);
    client = await SqlClient.create(pluginContext.azureAccountProvider!, sqlPlugin.sqlImpl.config);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("addDatabaseUser error", async function () {
    // Arrange
    sinon
      .stub(SqlClient.prototype, "doQuery")
      .resolves()
      .onThirdCall()
      .rejects(new Error("test error"));

    // Act
    try {
      await client.addDatabaseUser("test_db");
    } catch (error) {
      // Assert
      chai.assert.include(error.notificationMessage, ErrorMessage.GetDetail);
    }
  });

  it("addDatabaseUser firewall error", async function () {
    // Arrange
    const err: any = new Error(
      "Client with IP address '1.1.1.1' is not allowed to access the server."
    );
    err.code = "ELOGIN";
    sinon.stub(SqlClient.prototype, "doQuery").rejects(err);

    // Act
    try {
      await client.addDatabaseUser("test_db");
    } catch (error) {
      // Assert
      chai.assert.isTrue(SqlClient.isFireWallError(error?.innerError));
    }
  });

  it("addDatabaseUser admin error", async function () {
    // Arrange
    sinon
      .stub(SqlClient.prototype, "doQuery")
      .rejects(new Error("test error:" + ErrorMessage.GuestAdminMessage));

    // Act
    try {
      await client.addDatabaseUser("test_db");
    } catch (error) {
      // Assert
      chai.assert.include(error.notificationMessage, ErrorMessage.GuestAdminError);
    }
  });
});

describe("sqlClient", () => {
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

  it("initToken no provider error", async function () {
    // Arrange
    pluginContext.azureAccountProvider!.getIdentityCredentialAsync = async () => undefined;

    // Act
    try {
      await SqlClient.initToken(pluginContext.azureAccountProvider!, sqlPlugin.sqlImpl.config);
    } catch (error) {
      // Assert
      const reason = ErrorMessage.IdentityCredentialUndefine(
        sqlPlugin.sqlImpl.config.identity,
        `(${sqlPlugin.sqlImpl.config.databaseName})`
      );
      chai.assert.include(error.message, reason);
    }
  });

  it("initToken token error", async function () {
    // Arrange
    sinon.stub(SqlClient.prototype, "doQuery").rejects(new Error("test error"));

    // Act
    try {
      await SqlClient.initToken(pluginContext.azureAccountProvider!, sqlPlugin.sqlImpl.config);
    } catch (error) {
      // Assert
      chai.assert.include(error.notificationMessage, ErrorMessage.GetDetail);
    }
  });

  it("initToken error with domain code", async function () {
    // Arrange
    sinon
      .stub(msRestNodeAuth.ApplicationTokenCredentials.prototype, "getToken")
      .rejects(new Error("test error" + ErrorMessage.DomainCode));

    // Act
    try {
      await SqlClient.initToken(pluginContext.azureAccountProvider!, sqlPlugin.sqlImpl.config);
    } catch (error) {
      // Assert
      chai.assert.include(error.notificationMessage, ErrorMessage.DomainError);
    }
  });
});
