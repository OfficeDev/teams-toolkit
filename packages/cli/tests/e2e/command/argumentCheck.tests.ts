// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { expect } from "chai";

import { isGAPreviewEnabled } from "../../../src/utils";
import { execAsync } from "../commonUtils";

describe("teamsfx command argument check", function () {
  it(`teamsfx add me`, async function () {
    try {
      const command = isGAPreviewEnabled() ? `teamsfx add me` : `teamsfx capability add me`;
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
