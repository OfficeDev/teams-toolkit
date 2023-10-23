// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlagName } from "../../src/common/constants";
import {
  initializePreviewFeatureFlags,
  isCliNewUxEnabled,
  isCliV3Enabled,
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

  describe("isCliNewUxEnabled()", () => {
    it("is true", async () => {
      const res = isCliNewUxEnabled();
      chai.assert.isTrue(res);
    });
  });

  describe("isCliV3Enabled()", () => {
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      mockedEnvRestore();
    });
    it("is true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_V3: "true" });
      const res = isCliV3Enabled();
      chai.assert.isTrue(res);
    });
    it("is false", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_V3: "false" });
      const res = isCliV3Enabled();
      chai.assert.isFalse(res);
    });
  });
});
