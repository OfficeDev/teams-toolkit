// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yefu Wang <yefuwang@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./NotificationBotHappyPathCommon";
import { it } from "../../commonlib/it";

describe("Provision Notification Dotnet", () => {
    it("Provision Resource: Notification Dotnet", { testPlanCaseId: 15685831 }, async function () {
        await happyPathTest(Runtime.Dotnet);
    });
});

