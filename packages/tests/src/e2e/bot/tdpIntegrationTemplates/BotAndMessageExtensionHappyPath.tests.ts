// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 **/
import { happyPathTest } from "../BotHappyPathCommon";
import { Runtime } from "../../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision bot-and-me for TDP integration", () => {
  it(
    "Provision Resource: bot-and-me for TDP ingeration",
    { testPlanCaseId: 26547370, author: "yuqzho@microsoft.com" },
    async function () {
      await happyPathTest(
        Runtime.Node,
        "BotAndMessageExtension",
        undefined,
        true
      );
    }
  );
});
