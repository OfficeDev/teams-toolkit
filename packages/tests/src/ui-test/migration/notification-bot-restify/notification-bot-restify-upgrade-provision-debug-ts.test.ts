// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

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
  validateNotificationBot,
  initPage,
} from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  upgradeByTreeView,
  validateUpgrade,
} from "../../../utils/vscodeOperation";
import {
  CLIVersionCheck,
  getBotSiteEndpoint,
} from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
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
    await mirgationDebugTestContext.after(false, true, "dev");
  });

  it(
    "[auto] notification bot template upgrade test - ts",
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
      // verify upgrade
      await validateUpgrade();
      // enable cli v3
      CliHelper.setV3Enable();

      // install test cil in project
      await CliHelper.installCLI(
        Env.TARGET_CLI,
        false,
        mirgationDebugTestContext.testRootFolder
      );
      // enable cli v3
      CliHelper.setV3Enable();

      // remote provision
      await mirgationDebugTestContext.provisionWithCLI("dev", true);
      // remote deploy
      await CLIVersionCheck("V3", mirgationDebugTestContext.testRootFolder);
      await mirgationDebugTestContext.deployWithCLI("dev");

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
