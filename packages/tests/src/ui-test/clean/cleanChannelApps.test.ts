// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import {
  openPage,
  cleanInstalledChannelApp,
} from "../../utils/playwrightOperation";
import { Timeout } from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import os from "os";
import { LocalDebugTestContext } from "../localdebug/localdebugContext";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.cleanTestCase);
  let localDebugTestContext: LocalDebugTestContext;
  let successFlag = true;
  let errorMessage = "";

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.cleanTestCase);
    localDebugTestContext = new LocalDebugTestContext("bot", "typescript");
    await localDebugTestContext.before();
  });

  after(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
    setTimeout(() => {
      if (os.type() === "Windows_NT") {
        if (successFlag) process.exit(0);
        else process.exit(1);
      }
    }, 30000);
  });

  it("clean app", async function () {
    try {
      const page = await openPage(
        localDebugTestContext.context!,
        Env.username,
        Env.password
      );
      await cleanInstalledChannelApp(page, { deleteAppNum: 20 });
    } catch (error) {
      successFlag = false;
      errorMessage = "[Error]: " + error;
      await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
      await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
    }

    console.log("clean finish!");
  });
});
