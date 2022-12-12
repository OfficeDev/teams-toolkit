// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Provision for Node", () => {
  it(
    "Provision Resource: func hosted notification",
    { testPlanCaseId: 15685881 },
    async function () {
      if (isV3Enabled()) {
        return this.skip();
      }
      await happyPathTest(Runtime.Node, "notification", ["http-functions"]);
    }
  );
});
