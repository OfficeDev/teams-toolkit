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
  validateNotificationBot,
  initPage,
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
  updateDeverloperInManifestFile,
} from "../../../utils/commonUtils";
import * as path from "path";
import { updatePakcageJson } from "./helper";
import {
  deployProject,
  provisionProject,
} from "../../remotedebug/remotedebugContext";

describe("Migration Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let mirgationDebugTestContext: MigrationTestContext;
  CliHelper.setV3Enable();

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Notification,
      "javascript",
      Trigger.Restify
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after(true, true, "dev");

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(
      `[Successfully] start to clean up for ${mirgationDebugTestContext.projectPath}`
    );
    await mirgationDebugTestContext.cleanUp(
      mirgationDebugTestContext.appName,
      mirgationDebugTestContext.projectPath,
      true,
      true,
      false
    );
  });

  it(
    "[auto] V4.0.0 notification bot template upgrade test - js",
    {
      testPlanCaseId: 17431843,
      author: "frankqian@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);

      // update package.json in bot folder
      updatePakcageJson(
        path.join(mirgationDebugTestContext.projectPath, "bot", "package.json")
      );

      // verify popup
      await validateNotification(Notification.Upgrade);

      await CLIVersionCheck("V2", mirgationDebugTestContext.testRootFolder);
      // remote provision
      await mirgationDebugTestContext.provisionWithCLI("dev", false);

      // upgrade
      await upgradeByTreeView();
      // verify upgrade
      await validateUpgrade();

      // install test cil in project
      await CliHelper.installCLI(
        Env.TARGET_CLI,
        false,
        mirgationDebugTestContext.testRootFolder
      );
      // enable cli v3
      CliHelper.setV3Enable();

      await updateDeverloperInManifestFile(
        mirgationDebugTestContext.projectPath
      );

      // v3 provision
      await provisionProject(
        mirgationDebugTestContext.appName,
        mirgationDebugTestContext.projectPath
      );
      await deployProject(mirgationDebugTestContext.projectPath);

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
      // await validateNotificationBot(page, funcEndpoint + "/api/notification");
    }
  );
});
