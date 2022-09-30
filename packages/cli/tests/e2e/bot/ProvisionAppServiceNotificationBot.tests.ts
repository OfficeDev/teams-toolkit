// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./NotificationBotHappyPathCommon";
import { it } from "../../commonlib/it";

describe("Provision Notification Node", () => {
    it("Provision Resource: Notification Node", { testPlanCaseId: 15685832 }, async function () {
        await happyPathTest(Runtime.Node);
    });
});