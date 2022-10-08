// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import it from "@microsoft/extra-shot-mocha";

describe("Provision for Node", () => {
  it("Provision Resource: func hosted notification",{ testPlanCaseId: 15685881 }, async function () {
    await happyPathTest(Runtime.Node, "notification", ["http-functions"]);
  });
});
