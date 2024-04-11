// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import mockedEnv, { RestoreFn } from "mocked-env";

import { FeatureFlagName } from "../../src/common/constants";
import {
  initializePreviewFeatureFlags,
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
