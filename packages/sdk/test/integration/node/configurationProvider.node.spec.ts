// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert, use as chaiUse, expect } from "chai";
import chaiPromises from "chai-as-promised";
import { MockEnvironmentVariable, RestoreEnvironmentVariable } from "../../helper";
import { loadConfiguration, getResourceConfiguration, ResourceType, ErrorWithCode, ErrorCode } from "../../../src";

chaiUse(chaiPromises);

describe("configurationProvider integration test - node", () => {
  before(() => {
    MockEnvironmentVariable();
  });
  after(() => {
    RestoreEnvironmentVariable();
  });
  it("getResourceConfiguration success", () => {
    loadConfiguration();

    const result = getResourceConfiguration(ResourceType.SQL);
    assert.isNotNull(result);
    assert.strictEqual(result!.sqlServerEndpoint, process.env.SQL_ENDPOINT);
    assert.strictEqual(result!.sqlUsername, process.env.SQL_USER_NAME);
    assert.strictEqual(result!.sqlPassword, process.env.SQL_PASSWORD);
    assert.strictEqual(result!.sqlDatabaseName, process.env.SQL_DATABASE_NAME);
  });

  it("getResourceConfiguration throw error with incorrect type", () => {
    loadConfiguration();
    try {
      getResourceConfiguration(ResourceType.API);
    } catch (err) {
      expect(err).to.be.instanceOf(ErrorWithCode);
      // todo: define expected value in test case, instead of using enum from SDK.
      expect(err.code).to.eql(ErrorCode.InvalidConfiguration);
    }
  });

  it("getResourceConfiguration throw error without name exist", () => {
    loadConfiguration();
    try {
      getResourceConfiguration(ResourceType.SQL, "API-1");
    } catch (err) {
      expect(err).to.be.instanceOf(ErrorWithCode);
      expect(err.code).to.eql(ErrorCode.InvalidConfiguration);
    }
  });
});
