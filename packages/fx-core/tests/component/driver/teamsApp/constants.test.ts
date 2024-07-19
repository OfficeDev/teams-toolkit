// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { expect } from "chai";
import {
  getConfigurableTabsTplBasedOnVersion,
  CONFIGURABLE_TABS_TPL_V3,
  CONFIGURABLE_TABS_TPL_V4,
} from "../../../../src/component/driver/teamsApp/constants";

describe("constants", async () => {
  it("get configurable tabs tpl based on version - V3", async () => {
    const result = getConfigurableTabsTplBasedOnVersion("1.16");
    expect(result).to.equal(CONFIGURABLE_TABS_TPL_V3);
  });
});
