// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

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

  it(`teamsfx resource add azure-apim -h`, async function () {
    const result = await execAsync(`teamsfx resource add azure-apim -h`, {
      env: process.env,
      timeout: 0,
    });
    expect(result.stdout).includes("--function-name");
    expect(result.stdout).not.includes("--resource-group");
  });
});
