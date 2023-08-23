// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yukun-dong <yukundong@microsoft.com>
 */

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Remote happy path for message extension search dotnet", () => {
  it(
    "Remote happy path for message extension search dotnet",
    { testPlanCaseId: 24916471, author: "yukundong@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Dotnet, "search-message-extension");
    }
  );
});
