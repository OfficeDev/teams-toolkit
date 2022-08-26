import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TestHelper } from "../helper";
import { SqlPlugin } from "../../../../../src/plugins/resource/sql";
import * as dotenv from "dotenv";
import { PluginContext, UserError } from "@microsoft/teamsfx-api";
import * as faker from "faker";
import * as sinon from "sinon";
import { SqlClient } from "../../../../../src/plugins/resource/sql/sqlClient";
import { ErrorMessage } from "../../../../../src/plugins/resource/sql/errors";
import { getLocalizedString } from "../../../../../src/common/localizeUtils";

chai.use(chaiAsPromised);

dotenv.config();

describe("sqlClient", () => {
  let sqlPlugin: SqlPlugin;
  let pluginContext: PluginContext;
  let client: SqlClient;

  before(async () => {});

  beforeEach(async () => {
    sqlPlugin = new SqlPlugin();
    pluginContext = await TestHelper.pluginContext();
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
      chai.assert.include(error.displayMessage, getLocalizedString("error.sql.GetDetail"));
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
      chai.assert.include(error.displayMessage, ErrorMessage.GuestAdminError);
    }
  });
});

describe("sqlClient", () => {
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
      chai.assert.include(error.displayMessage, getLocalizedString("error.sql.GetDetail"));
    }
  });

  it("initToken error with domain code", async function () {
    // Act
    try {
      await SqlClient.initToken(pluginContext.azureAccountProvider!, sqlPlugin.sqlImpl.config);
    } catch (error) {
      // Assert
      chai.assert.include(error.displayMessage, ErrorMessage.DomainError);
    }
  });
});
