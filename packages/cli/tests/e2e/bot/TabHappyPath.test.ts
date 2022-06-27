// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "../../commonlib/it";

describe("Provision for Node", () => {
  it("Provision Resource: func hosted notification", async function () {
    await happyPathTest(Runtime.Node, "tab");
  });
});
