// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./NotificationBotHappyPathCommon";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision Notification Node", () => {
  it(
    "Provision Resource: Notification Node",
    { testPlanCaseId: 15685832, author: "fanhu@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node);
    }
  );
});
