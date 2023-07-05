// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 */

import { Runtime } from "../../commonlib/constants";
import { happyPathTest } from "./WorkflowBotHappyPathCommon";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision for Node", () => {
  it(
    "Provision Resource: func hosted notification",
    { testPlanCaseId: 24137416, author: "fanhu@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node);
    }
  );
});
