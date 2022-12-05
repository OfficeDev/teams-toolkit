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

describe("teamsfx command help", function () {
  it(`teamsfx account show -h`, { testPlanCaseId: 15685961 }, async function () {
    const result = await execAsync(`teamsfx account show -h`, {
      env: process.env,
      timeout: 0,
    });
    expect(result.stdout).not.includes("--action");
  });

  it(`teamsfx add azure-apim -h`, { testPlanCaseId: 15685963 }, async function () {
    /// TODO: will be deleted when not support V2
    if (isV3Enabled()) {
      this.skip();
    }
    const command = isPreviewFeaturesEnabled()
      ? `teamsfx add azure-apim -h`
      : `teamsfx resource add azure-apim -h`;
    const result = await execAsync(command, {
      env: process.env,
      timeout: 0,
    });
    expect(result.stdout).includes("--function-name");
    expect(result.stdout).not.includes("--resource-group");
  });
});
