// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./CommandBotHappyPathCommon";
import { it } from "../../commonlib/it";

describe("Provision CommandBot Dotnet", () => {
  it(
    "Provision Resource: CommandBot Node",
    { testPlanCaseId: 15685858, author: "fanhu@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node);
    }
  );
});
