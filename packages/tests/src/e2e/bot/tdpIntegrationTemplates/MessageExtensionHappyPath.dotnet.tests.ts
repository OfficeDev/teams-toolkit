// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 **/
import { happyPathTest } from "../BotHappyPathCommon";
import { Runtime } from "../../../commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";

describe("Provision message extension in dotnet used for TDP integration", () => {
  it(
    "Provision Resource: message extension in dotnet for TDP integration",
    { testPlanCaseId: 26547389, author: "yuqzho@microsoft.com" },
    async function () {
      await happyPathTest(Runtime.Dotnet, "message-extension", undefined, true);
    }
  );
});
