// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./CommandBotHappyPathCommon";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision CommandBot Dotnet", () => {
  it(
    "Provision Resource: CommandBot Dotnet",
    { testPlanCaseId: 15685857, author: "fanhu@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Dotnet);
    }
  );
});
