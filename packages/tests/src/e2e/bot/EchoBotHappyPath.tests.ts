// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yukun-dong <yukundong@microsoft.com>
 */

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Remote happy path for echo bot node", () => {
  it(
    "Remote happy path for echo bot node",
    { testPlanCaseId: 24907383, author: "yukundong@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node, "bot");
    }
  );
});
