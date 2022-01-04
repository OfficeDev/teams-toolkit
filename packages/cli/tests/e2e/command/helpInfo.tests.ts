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
});
