// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 **/
import { happyPathTest } from "../BotHappyPathCommon";
import { Runtime } from "../../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision non-sso-tab-and-bot TDP integration", () => {
  it(
    "Provision Resource: non-sso-tab-and-bot for TDP ingeration",
    { testPlanCaseId: 26547334, author: "yuqzho@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node, "TabNonSsoAndBot", undefined, true);
    }
  );
});
