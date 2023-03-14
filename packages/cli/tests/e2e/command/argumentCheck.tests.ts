// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { isPreviewFeaturesEnabled } from "@microsoft/teamsfx-core/build/common/featureFlags";
import { expect } from "chai";
import { it } from "@microsoft/extra-shot-mocha";

import { execAsync } from "../commonUtils";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("teamsfx command argument check", function () {
  it(`teamsfx add me`, { testPlanCaseId: 15685949 }, async function () {
    /// TODO: will be deleted when not support V2
    if (isV3Enabled()) {
      this.skip();
    }
    try {
      const command = isPreviewFeaturesEnabled() ? `teamsfx add me` : `teamsfx capability add me`;
      await execAsync(command, {
        env: process.env,
        timeout: 0,
      });
      throw "should throw an error";
    } catch (e) {
      expect(e.message).includes("Invalid values");
    }
  });
});
