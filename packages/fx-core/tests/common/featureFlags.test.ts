// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlags, featureFlagManager } from "../../src/common/featureFlags";
chai.use(chaiAsPromised);

describe("FeatureFlagManager", () => {
  let mockedEnvRestore: RestoreFn = () => {};
  afterEach(() => {
    mockedEnvRestore();
  });
  it("getBooleanValue, getStringValue is true", async () => {
    mockedEnvRestore = mockedEnv({ API_COPILOT_PLUGIN_AUTH: "true" });
    const booleanRes = featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth);
    chai.assert.isTrue(booleanRes);
    const stringRes = featureFlagManager.getStringValue(FeatureFlags.CopilotAuth);
    chai.assert.equal(stringRes, "true");
  });
  it("getBooleanValue, getStringValue is false", async () => {
    mockedEnvRestore = mockedEnv({ API_COPILOT_PLUGIN_AUTH: "false" });
    const booleanRes = featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth);
    chai.assert.isFalse(booleanRes);
    const stringRes = featureFlagManager.getStringValue(FeatureFlags.CopilotAuth);
    chai.assert.equal(stringRes, "false");
  });
  it("list", async () => {
    const list = featureFlagManager.list();
    chai.assert.deepEqual(list, Object.values(FeatureFlags));
  });
});
