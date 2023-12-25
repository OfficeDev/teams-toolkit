// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Trigger,
  Notification,
  LocalDebugTaskLabel,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  validateNotificationBot,
  initPage,
} from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  startDebugging,
  upgradeByTreeView,
  waitForTerminal,
  validateUpgrade,
} from "../../../utils/vscodeOperation";
import { getScreenshotName } from "../../../utils/nameUtil";
import { VSBrowser } from "vscode-extension-tester";

describe("Migration Tests", function () {
  this.timeout(Timeout.migrationTestCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Notification,
      "typescript",
      Trigger.Http
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(false, true, "local");
  });

  it(
    "[auto] [P0] V2 notification bot template upgrade test - ts",
    {
      testPlanCaseId: 17184123,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      // local debug with TTK
      await startDebugging("Debug (Chrome)");
      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      try {
        await waitForTerminal(
          "Start Azurite emulator",
          "Azurite Blob service is successfully listening"
        );
        await waitForTerminal(
          LocalDebugTaskLabel.StartBot,
          "Worker process started and initialized"
        );
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId();

      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateNotificationBot(
        page,
        "http://127.0.0.1:3978/api/notification"
      );
    }
  );
});
