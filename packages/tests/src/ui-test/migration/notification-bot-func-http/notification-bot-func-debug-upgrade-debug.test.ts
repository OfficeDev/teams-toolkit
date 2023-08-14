// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Trigger,
  Notification,
  LocalDebugTaskLabel,
  CliVersion,
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
  upgrade,
  waitForTerminal,
  validateUpgrade,
  stopDebugging,
} from "../../../utils/vscodeOperation";
import { execCommand } from "../../../utils/execCommand";
import { expect } from "chai";
import { ModalDialog, VSBrowser } from "vscode-extension-tester";
import { CLIVersionCheck } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.migrationTestCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Notification,
      "javascript",
      Trigger.Http
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(false, true, "local");
  });

  it(
    "[auto] [P0] V2 notification bot template upgrade test - js",
    {
      testPlanCaseId: 17184124,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // install v2 stable cli 1.2.6
      await CliHelper.installCLI(CliVersion.V2TeamsToolkitStable425, false);
      await CLIVersionCheck("V2", mirgationDebugTestContext.testRootFolder);
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      try {
        await validateNotification(Notification.Upgrade);
      } catch (error) {
        await validateNotification(Notification.Upgrade_dicarded);
      }

      // local debug
      await mirgationDebugTestContext.debugWithCLI("local");

      // upgrade
      await startDebugging();
      await upgrade();
      // verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      // local debug with TTK
      const driver = VSBrowser.instance.driver;
      await startDebugging();
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
      } catch {
        const dialog = new ModalDialog();
        console.log("click Cancel button for error dialog");
        await dialog.pushButton("Cancel");
        await driver.sleep(Timeout.shortTimeLoading);
        console.log(
          "Clicked button Cancel for failing to attach to main target"
        );
        await stopDebugging();
        await startDebugging();
        try {
          await waitForTerminal(
            LocalDebugTaskLabel.StartBot,
            "Worker process started and initialized"
          );
        } catch {
          const dialog = new ModalDialog();
          console.log("click Cancel button for error dialog");
          await dialog.pushButton("Debug Anyway");
          console.log("Clicked button Debug Anyway");
          await driver.sleep(Timeout.shortTimeLoading);
          await waitForTerminal(
            LocalDebugTaskLabel.StartBot,
            "Worker process started and initialized"
          );
        }
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
