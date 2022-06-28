// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "../../commonlib/it";

describe("Provision message extension Node", () => {
  it("Provision Resource: message extension node", async function () {
    await happyPathTest(Runtime.Node, "message-extension");
  });
});
