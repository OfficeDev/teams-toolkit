// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Frank Qian <frankqian@microsoft.com>
 */

import { MigrationTestContext } from "../migrationContext";
import { Timeout, Capability, Notification } from "../../../utils/constants";
import { it } from "../../../utils/it";
import { Env } from "../../../utils/env";
import { validateMsg, initPage } from "../../../utils/playwrightOperation";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  upgradeByTreeView,
  validateUpgrade,
  execCommandIfExist,
} from "../../../utils/vscodeOperation";
import { CLIVersionCheck } from "../../../utils/commonUtils";

describe("Migration Tests", function () {
  this.timeout(Timeout.migrationTestCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Tab,
      "javascript"
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
    "[auto] local debugged and provisioned message extension template upgrade test - js",
    {
      testPlanCaseId: 17184121,
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
      // install test cil in project
      await CliHelper.installCLI(
        Env.TARGET_CLI,
        false,
        mirgationDebugTestContext.projectPath
      );
      // enable cli v3
      CliHelper.setV3Enable();

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
      await validateMsg(page);
    }
  );
});
