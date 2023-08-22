// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yukun-dong <yukundong@microsoft.com>
 */

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Deploy happy path for link unfurling dotnet", () => {
  it(
    "Deploy happy path for link unfurling dotnet",
    { testPlanCaseId: 24916471, author: "yukundong@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Dotnet, "search-message-extension");
    }
  );
});
