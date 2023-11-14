// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlagName } from "../../src/common/constants";
import { initializePreviewFeatureFlags, isApiKeyEnabled } from "../../src/common/featureFlags";

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

  describe("isApiKeyEnabled()", () => {
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      mockedEnvRestore();
    });
    it("is true", async () => {
      mockedEnvRestore = mockedEnv({ API_COPILOT_API_KEY: "true" });
      const res = isApiKeyEnabled();
      chai.assert.isTrue(res);
    });
    it("is false", async () => {
      mockedEnvRestore = mockedEnv({ API_COPILOT_API_KEY: "false" });
      const res = isApiKeyEnabled();
      chai.assert.isFalse(res);
    });
  });
});
