// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */

import { expect } from "chai";
import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Notification,
  Framework,
  CommandPaletteCommands,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  initPage,
  validateTeamsWorkbench,
} from "../../../utils/playwrightOperation";
import {
  validateNotification,
  validateUpgrade,
  upgradeByTreeView,
  getNotification,
  execCommandIfExist,
  clearNotifications,
} from "../../../utils/vscodeOperation";
import { CliHelper } from "../../cliHelper";
import { VSBrowser, InputBox } from "vscode-extension-tester";
import { CLIVersionCheck } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Spfx,
      "javascript",
      undefined,
      Framework.React
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after();
  });

  it(
    "[auto] V2 spfx react migrate test",
    {
      testPlanCaseId: 17184356,
      author: "v-helzha@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

      await CLIVersionCheck("V2", mirgationDebugTestContext.projectPath);
      // v2 provision
      await mirgationDebugTestContext.provisionWithCLI("dev", false);

      // upgrade
      await upgradeByTreeView();
      //verify upgrade
      await validateUpgrade();

      // install test cil in project
      await CliHelper.installCLI(
        Env.TARGET_CLI,
        false,
        mirgationDebugTestContext.projectPath
      );
      // enable cli v3
      CliHelper.setV3Enable();

      await clearNotifications();
      await execCommandIfExist(CommandPaletteCommands.ProvisionCommand);
      const driver = VSBrowser.instance.driver;
      await driver.sleep(Timeout.spfxProvision);
      await getNotification(
        Notification.ProvisionSucceeded,
        Timeout.shortTimeWait
      );

      await clearNotifications();
      await execCommandIfExist(CommandPaletteCommands.DeployCommand);
      try {
        const deployConfirmInput = await InputBox.create();
        await deployConfirmInput.confirm();
      } catch (error) {
        console.log("No need to confirm to deploy.");
      }
      await driver.sleep(Timeout.spfxDeploy);
      await getNotification(Notification.DeploySucceeded, Timeout.longTimeWait);

      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("dev");
      expect(teamsAppId.length).to.equal(36);
      console.log(teamsAppId);
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      // await validateTeamsWorkbench(page, Env.displayName);
    }
  );
});
