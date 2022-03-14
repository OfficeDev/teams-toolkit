// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ExtensionContext } from "vscode";

import { ext } from "../../../src/extensionVariables";
import { TestUserInput } from "./mocks/testUserInput";
import { sleep } from "../../../src/utils/commonUtils";
import { VsCodeUI } from "../../../src/qm/vsc_ui";
import * as sinon from "sinon";

suite("UI Unit Tests", async () => {
  suiteSetup(() => {
    // Mock user input.
    ext.ui = new TestUserInput();
    sinon.stub(ext, "context").returns({ extensionPath: "" });
  });

  suite("Manually", () => {
    test("Show Progress 2", async function (this: Mocha.Context) {
      this.timeout(0);
      const VS_CODE_UI = new VsCodeUI(<ExtensionContext>{});
      const handler = VS_CODE_UI.createProgressBar("Test Progress Bar", 3);

      await handler.start("Prepare");
      await sleep(2 * 1000);

      await handler.next("First step");
      await sleep(2 * 1000);

      await handler.next("Second step");
      await sleep(2 * 1000);

      await handler.next("Third step");
      await sleep(2 * 1000);

      await handler.end(true);
    });
  });
});
