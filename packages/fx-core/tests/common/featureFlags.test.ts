// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlagName } from "../../src/common/constants";
import {
  initializePreviewFeatureFlags,
  isBotNotificationEnabled,
  isCLIDotNetEnabled,
  isTDPIntegrationEnabled,
} from "../../src/common/featureFlags";

chai.use(chaiAsPromised);

describe("featureFlags", () => {
  describe("isBotNotificationEnabled()", () => {
    let mockedEnvRestore: RestoreFn;

    it("return true if env variable is set", async () => {
      mockedEnvRestore = mockedEnv({
        [FeatureFlagName.BotNotification]: "true",
        TEAMSFX_V3: "false",
      });

      const result = isBotNotificationEnabled();

      chai.assert.isTrue(result);
      mockedEnvRestore();
    });

    it("return false if env variable is not set", async () => {
      mockedEnvRestore = mockedEnv({});

      const result = isBotNotificationEnabled();

      chai.assert.isFalse(result);
      mockedEnvRestore();
    });
  });

  describe("initializePreviewFeatureFlags()", () => {
    let mockedEnvRestore: RestoreFn;

    beforeEach(() => {
      mockedEnvRestore = mockedEnv({}, { clear: true });
    });

    afterEach(() => {
      mockedEnvRestore();
    });

    it("successfully open all feature flags", async () => {
      chai.assert.isFalse(isBotNotificationEnabled());

      initializePreviewFeatureFlags();

      chai.assert.isTrue(isBotNotificationEnabled());
    });
  });

  describe("isTDPIntegrationEnabled()", () => {
    let mockedEnvRestore: RestoreFn;

    it("return true if env variable is set", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "true" });

      const result = isTDPIntegrationEnabled();

      chai.assert.isTrue(result);
      mockedEnvRestore();
    });

    it("return false if env variable is not set", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.V3]: "false" });

      const result = isTDPIntegrationEnabled();

      chai.assert.isFalse(result);
      mockedEnvRestore();
    });
  });
});
