// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Siglud <fanhu@microsoft.com>
 **/
import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision message extension action Node", () => {
  it(
    "Provision Resource: message extension action node",
    { testPlanCaseId: 15685647, author: "fanhu@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Node, "collect-form-message-extension");
    }
  );
});
