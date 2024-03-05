// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Frank Qian <frankqian@microsoft.com>
 */

import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import { validateMsg, initPage } from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  startDebugging,
  waitForTerminal,
  validateUpgrade,
  upgradeByTreeView,
} from "../../../utils/vscodeOperation";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../../utils/nameUtil";
import { updateDeverloperInManifestFile } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.migrationTestCase);
  let mirgationDebugTestContext: MigrationTestContext;
  CliHelper.setV3Enable();

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.MessageExtension,
      "javascript"
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(true, true, "local");
  });

  it(
    "[auto] V4.0.0 message extension template migrate test - js",
    {
      testPlanCaseId: 17431841,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

      // local debug
      await mirgationDebugTestContext.debugWithCLI("local", false);

      // upgrade
      await upgradeByTreeView();
      // verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      // local debug with TTK
      try {
        await updateDeverloperInManifestFile(
          mirgationDebugTestContext.projectPath
        );
        await startDebugging("Debug (Chrome)");

        console.log("Start Local Tunnel");
        await waitForTerminal(
          LocalDebugTaskLabel.StartLocalTunnel,
          LocalDebugTaskResult.StartSuccess
        );

        console.log("Start Bot");
        await waitForTerminal("Start Bot", LocalDebugTaskResult.AppSuccess);
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        throw new Error(error as string);
      }

      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId();

      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateMsg(page);
      console.log("debug finish!");
    }
  );
});
