// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlagName } from "../../src/common/constants";
import { initializePreviewFeatureFlags, isCliNewUxEnabled } from "../../src/common/featureFlags";

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
    let mockedEnvRestore: RestoreFn = () => {};
    afterEach(() => {
      mockedEnvRestore();
    });

    it("is true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_NEW_UX: "true" });
      const res = isCliNewUxEnabled();
      chai.assert.isTrue(res);
    });
    it("is true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_NEW_UX: "false" });
      const res = isCliNewUxEnabled();
      chai.assert.isFalse(res);
    });
  });
});
