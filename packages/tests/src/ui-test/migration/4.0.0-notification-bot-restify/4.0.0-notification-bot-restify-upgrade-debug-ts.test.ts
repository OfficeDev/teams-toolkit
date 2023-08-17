// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Trigger,
  Notification,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
  CliVersion,
  LocalDebugTaskLabel2,
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
  waitForTerminal,
  validateUpgrade,
  upgradeByTreeView,
} from "../../../utils/vscodeOperation";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../../utils/nameUtil";
import { execCommand } from "../../../utils/execCommand";
import { updateDeverloperInManifestFile } from "../../../utils/commonUtils";
import { expect } from "chai";

describe("Migration Tests", function () {
  this.timeout(Timeout.migrationTestCase);
  let mirgationDebugTestContext: MigrationTestContext;
  CliHelper.setV3Enable();

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Notification,
      "typescript",
      Trigger.Restify
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(true, true, "local");
  });

  it(
    "[auto] V4.0.0 notification bot template upgrade test - ts",
    {
      testPlanCaseId: 17431842,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

      // upgrade
      await upgradeByTreeView();
      // verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      await updateDeverloperInManifestFile(
        mirgationDebugTestContext.projectPath
      );

      // local debug with TTK
      try {
        await startDebugging();

        console.log("Start Local Tunnel");
        await waitForTerminal(
          LocalDebugTaskLabel.StartLocalTunnel,
          LocalDebugTaskResult.StartSuccess
        );

        console.log("Start Bot");
        await waitForTerminal(
          LocalDebugTaskLabel2.StartBot2,
          LocalDebugTaskResult.AppSuccess
        );
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
      await validateNotificationBot(page);
    }
  );
});
