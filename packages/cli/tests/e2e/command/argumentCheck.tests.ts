// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { expect } from "chai";

import { execAsync } from "../commonUtils";

describe("teamsfx command argument check", function () {
  it(`teamsfx capability add me`, async function () {
    try {
      await execAsync(`teamsfx capability add me`, {
        env: process.env,
        timeout: 0,
      });
      throw "should throw an error";
    } catch (e) {
      expect(e.message).includes("Invalid values");
    }
  });
});
