// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { happyPathTest } from "./BotHappyPathCommon";
import { Runtime } from "../../commonlib/constants";
import { it } from "../../commonlib/it";

describe("Provision message extension Dotnet", () => {
  it("Provision Resource: message extension dotnet", async function () {
    await happyPathTest(Runtime.Dotnet, "message-extension");
  });
});
