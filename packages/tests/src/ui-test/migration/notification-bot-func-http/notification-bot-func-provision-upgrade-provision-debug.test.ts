// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Frank Qian <frankqian@microsoft.com>
 */

import { MigrationTestContext } from "../migrationContext";
import {
  Timeout,
  Capability,
  Trigger,
  Notification,
} from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import {
  initPage,
  validateNotificationBot,
} from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  upgradeByTreeView,
  validateUpgrade,
  execCommandIfExist,
} from "../../../utils/vscodeOperation";
import {
  CLIVersionCheck,
  getBotSiteEndpoint,
} from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
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
    await mirgationDebugTestContext.after(false, true, "dev");

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(
      `[Successfully] start to clean up for ${mirgationDebugTestContext.projectPath}`
    );
    await mirgationDebugTestContext.cleanUp(
      mirgationDebugTestContext.appName,
      mirgationDebugTestContext.projectPath,
      false,
      true,
      false
    );
  });

  it(
    "[auto] [P0] V2 notification bot template upgrade test",
    {
      testPlanCaseId: 17184124,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);
      // verify popup
      await validateNotification(Notification.Upgrade);

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
        mirgationDebugTestContext.testRootFolder
      );
      // enable cli v3
      CliHelper.setV3Enable();

      // remote provision
      // v3 provision
      await mirgationDebugTestContext.provisionProject(
        mirgationDebugTestContext.appName,
        mirgationDebugTestContext.projectPath
      );
      // v3 deploy
      await CLIVersionCheck("V3", mirgationDebugTestContext.projectPath);
      await mirgationDebugTestContext.deployProject(
        mirgationDebugTestContext.projectPath,
        Timeout.botDeploy
      );

      const teamsAppId = await mirgationDebugTestContext.getTeamsAppId("dev");

      // UI verify
      const page = await initPage(
        mirgationDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      const funcEndpoint = await getBotSiteEndpoint(
        mirgationDebugTestContext.projectPath,
        "dev"
      );
      await validateNotificationBot(page, funcEndpoint + "/api/notification");
    }
  );
});
