// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Xiaofu Huang <xiaofhua@microsoft.com>
 */
import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision for Node", () => {
  it(
    "Provision Resource: func hosted notification",
    { testPlanCaseId: 24132570, author: "xiaofhua@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node, "notification", ["http-functions"]);
    }
  );
  it(
    "Provision Resource: func hosted notification timer trigger",
    { testPlanCaseId: 24132574, author: "qidon@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node, "notification", ["timer-functions"]);
    }
  );
  it(
    "Provision Resource: func hosted notification http and timer triggers",
    { testPlanCaseId: 24132576, author: "qidon@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node, "notification", [
        "http-and-timer-functions",
      ]);
    }
  );
});
