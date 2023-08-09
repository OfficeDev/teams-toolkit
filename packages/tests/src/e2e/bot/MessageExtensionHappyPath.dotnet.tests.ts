// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision message extension Dotnet", () => {
  it(
    "Provision Resource: message extension dotnet",
    { testPlanCaseId: 15685646, author: "fanhu@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Dotnet, "collect-form-message-extension");
    }
  );
});
