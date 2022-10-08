// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./CommandBotHappyPathCommon";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision CommandBot Dotnet", () => {
    it("Provision Resource: CommandBot Dotnet", { testPlanCaseId: 15685857 }, async function () {
        await happyPathTest(Runtime.Dotnet);
    });
});