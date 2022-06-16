import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { createContextV3 } from "../../../../src/component/utils";
import { SqlClient } from "../../../../src/component/resource/azureSql/clients/sql";
import { MockAzureAccountProvider, MockTools } from "../../../core/utils";
import { setTools } from "../../../../src/core/globalVars";
import sinon from "sinon";
import { ErrorMessage } from "../../../../src/component/resource/azureSql/errors";
import { SqlConfig } from "../../../../src/component/resource/azureSql/types";
import { getLocalizedString } from "../../../../src/common/localizeUtils";
import { TokenCredential } from "@azure/core-http";
import faker from "faker";
import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";

chai.use(chaiAsPromised);

describe("Azure-SQL sql client", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  const sqlConfig: SqlConfig = {
    identity: "mock-identity",
    sqlEndpoint: "mock-endpoint",
    databases: ["mock-database"],
  };
  let client: SqlClient;
  setTools(tools);

  beforeEach(async () => {
    const context = createContextV3();
    sandbox.stub(SqlClient, "initToken").resolves("mock token");
    client = await SqlClient.create(context.tokenProvider!.azureAccountProvider, sqlConfig);
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("addDatabaseUser error", async function () {
    sandbox
      .stub(SqlClient.prototype, "doQuery")
      .resolves()
      .onThirdCall()
      .rejects(new Error("test error"));

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
    sandbox.stub(SqlClient.prototype, "doQuery").rejects(err);

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
    sandbox
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

describe("sqlClient initToken", () => {
  const tools = new MockTools();
  const sandbox = sinon.createSandbox();
  setTools(tools);
  const sqlConfig: SqlConfig = {
    identity: "mock-identity",
    sqlEndpoint: "mock-endpoint",
    databases: ["mock-database"],
  };
  let credentials: msRestNodeAuth.TokenCredentialsBase;

  before(async () => {
    credentials = new msRestNodeAuth.ApplicationTokenCredentials(
      faker.datatype.uuid(),
      faker.internet.url(),
      faker.internet.password()
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("no provider error", async function () {
    const context = createContextV3();
    sandbox
      .stub(MockAzureAccountProvider.prototype, "getIdentityCredentialAsync")
      .resolves(undefined);

    try {
      await SqlClient.initToken(context.tokenProvider!.azureAccountProvider, sqlConfig);
    } catch (error) {
      const reason = ErrorMessage.IdentityCredentialUndefine(
        sqlConfig.identity,
        `(${sqlConfig.databases.join(",")})`
      );
      chai.assert.include(error.message, reason);
    }
  });

  it("token error", async function () {
    const context = createContextV3();
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return credentials as unknown as TokenCredential;
    };
    sandbox
      .stub(msRestNodeAuth.ApplicationTokenCredentials.prototype, "getToken")
      .rejects(new Error("mock error"));

    try {
      await SqlClient.initToken(context.tokenProvider!.azureAccountProvider, sqlConfig);
    } catch (error) {
      // Assert
      chai.assert.include(error.displayMessage, getLocalizedString("error.sql.GetDetail"));
    }
  });

  it("error with domain code", async function () {
    const context = createContextV3();
    context.tokenProvider!.azureAccountProvider.getIdentityCredentialAsync = async () => {
      return credentials as unknown as TokenCredential;
    };
    sandbox
      .stub(msRestNodeAuth.ApplicationTokenCredentials.prototype, "getToken")
      .rejects(new Error("mock error" + ErrorMessage.DomainCode));
    try {
      await SqlClient.initToken(context.tokenProvider!.azureAccountProvider, sqlConfig);
    } catch (error) {
      // Assert
      chai.assert.include(error.displayMessage, ErrorMessage.DomainError);
    }
  });
});
