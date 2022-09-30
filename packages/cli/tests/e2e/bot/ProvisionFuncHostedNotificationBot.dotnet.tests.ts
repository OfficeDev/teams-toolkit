// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "../../commonlib/it";

describe("Provision for Dotnet", () => {
  it("Provision Resource: func hosted notification", { testPlanCaseId: 15685880 }, async function () {
    await happyPathTest(Runtime.Dotnet, "notification", ["http-functions"]);
  });
});
