// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./FuncHostedNotificationHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "../../commonlib/it";

describe("Provision for Dotnet", () => {
  it("Provision Resource: func hosted notification", async function () {
    await happyPathTest(Runtime.Dotnet);
  });
});
