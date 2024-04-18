// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlagName } from "../../src/common/constants";
import {
  FeatureFlags,
  featureFlagManager,
  initializePreviewFeatureFlags,
  isCopilotAuthEnabled,
  isTeamsFxRebrandingEnabled,
} from "../../src/common/featureFlags";
chai.use(chaiAsPromised);

describe("featureFlags", () => {
  describe("initializePreviewFeatureFlags()", () => {
    let mockedEnvRestore: RestoreFn = () => {};

    beforeEach(() => {
      mockedEnvRestore = mockedEnv({}, { clear: true });
    });

    afterEach(() => {
      mockedEnvRestore();
    });

    it("successfully open all feature flags", async () => {
      initializePreviewFeatureFlags();
      chai.assert.isTrue(process.env[FeatureFlagName.BotNotification] === "true");
    });
  });

  describe("isCopilotAuthEnabled()", () => {
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      mockedEnvRestore();
    });
    it("is true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_COPILOT_AUTH: "true" });
      const res = isCopilotAuthEnabled();
      chai.assert.isTrue(res);
    });
    it("is false", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_COPILOT_AUTH: "false" });
      const res = isCopilotAuthEnabled();
      chai.assert.isFalse(res);
    });
  });

  describe("isTeamsFxRebrandingEnabled()", () => {
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      mockedEnvRestore();
    });
    it("is true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_REBRANDING: "true" });
      const res = isTeamsFxRebrandingEnabled();
      chai.assert.isTrue(res);
    });
    it("is false", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_REBRANDING: "false" });
      const res = isTeamsFxRebrandingEnabled();
      chai.assert.isFalse(res);
    });
  });
});

describe("FeatureFlagManager", () => {
  let mockedEnvRestore: RestoreFn = () => {};
  afterEach(() => {
    mockedEnvRestore();
  });
  it("getBooleanValue, getStringValue is true", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_COPILOT_AUTH: "true" });
    const booleanRes = featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth);
    chai.assert.isTrue(booleanRes);
    const stringRes = featureFlagManager.getStringValue(FeatureFlags.CopilotAuth);
    chai.assert.equal(stringRes, "true");
  });
  it("getBooleanValue, getStringValue is false", async () => {
    mockedEnvRestore = mockedEnv({ TEAMSFX_COPILOT_AUTH: "false" });
    const booleanRes = featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth);
    chai.assert.isFalse(booleanRes);
    const stringRes = featureFlagManager.getStringValue(FeatureFlags.CopilotAuth);
    chai.assert.equal(stringRes, "false");
  });
  it("list", async () => {
    const booleanRes = featureFlagManager.getBooleanValue(FeatureFlags.CopilotAuth);
    chai.assert.isFalse(booleanRes);
    const list = featureFlagManager.list();
    chai.assert.deepEqual(list, Object.values(FeatureFlags));
  });
});
