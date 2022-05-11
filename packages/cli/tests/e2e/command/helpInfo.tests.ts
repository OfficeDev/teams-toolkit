// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { isPreviewFeaturesEnabled } from "@microsoft/teamsfx-core";
import { expect } from "chai";

import { execAsync } from "../commonUtils";

describe("teamsfx command help", function () {
  it(`teamsfx account show -h`, async function () {
    const result = await execAsync(`teamsfx account show -h`, {
      env: process.env,
      timeout: 0,
    });
    expect(result.stdout).not.includes("--action");
  });

  it(`teamsfx add azure-apim -h`, async function () {
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
