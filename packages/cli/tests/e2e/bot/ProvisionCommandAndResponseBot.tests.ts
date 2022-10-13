// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./CommandBotHappyPathCommon";
import { it } from "../../commonlib/it";

describe("Provision CommandBot Dotnet", () => {
  it("Provision Resource: CommandBot Node", { testPlanCaseId: 15685858 }, async function () {
    await happyPathTest(Runtime.Node);
  });
});
